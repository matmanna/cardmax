import { readFileSync } from "node:fs";

import { catalog, merchantMap } from "@cardmax/core";
import {
	type BrowserContext,
	test as base,
	chromium,
	expect,
	type Page,
	type Worker,
} from "@playwright/test";

// The WXT_E2E bundle. `bun run build:e2e` writes it.
const extensionPath = new URL("../.output/e2e/chrome-mv3", import.meta.url)
	.pathname;

// The web app origin the extension accepts messages from (wxt.config.ts default).
export const webOrigin = "http://localhost:3001";

// Hostname -> fixture page. Only these hosts are served; all else is blocked.
const stores = {
	bestbuy: "www.bestbuy.com",
	walmart: "www.walmart.com",
	amazon: "www.amazon.com",
	costco: "www.costco.com",
} as const;
export type Store = keyof typeof stores;

const fixtureHtml = new Map(
	Object.entries(stores).map(([name, host]) => [
		host,
		readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), "utf8"),
	]),
);
const webAppHtml = "<!doctype html><title>Cardmax web (fixture)</title>";

// Paths served for every fixture store: a product page and a checkout page
// with the same markup. Any other path is a 404.
const productPath = "/product/fixture";
export const checkoutPath = "/checkout";

// The Cardmax API the e2e bundle talks to (WXT_API_URL in build:e2e).
export const apiOrigin = "https://api.cardmax.test";
export const listingsUrl = `${apiOrigin}/api/rpc/listings/search`;

// What the mocked listings.search returns, in oRPC's { json } envelope.
export const mockListings = [
	{
		merchant: "bestbuy",
		domain: "www.bestbuy.com",
		title: "Acme 55-inch TV",
		priceUsd: 349.99,
		url: "https://www.bestbuy.com/product/fixture",
	},
	{
		merchant: "walmart",
		domain: "www.walmart.com",
		title: "Acme 55-inch TV",
		priceUsd: 339,
		url: "https://www.walmart.com/product/fixture",
	},
];

// The public catalog the mocked API serves: the real one, with one card
// renamed so a test can tell the pulled catalog from the bundled copy.
export const pulledCardName = "Active Cash (from the API)";
export const mockCatalog = {
	cards: catalog.map((card) =>
		card.id === "wells-fargo-active-cash"
			? { ...card, name: pulledCardName }
			: card,
	),
	merchants: Object.entries(merchantMap).map(([domain, category]) => ({
		domain,
		category,
	})),
	updatedAt: "2026-10-22T00:00:00Z",
};

const cors = {
	"access-control-allow-origin": "*",
	"access-control-allow-methods": "POST, OPTIONS",
	"access-control-allow-headers": "content-type, x-cardmax-device",
};

type Fixtures = {
	context: BrowserContext;
	serviceWorker: Worker;
	extensionId: string;
	// Requests to any host that is not a fixture. Must stay empty.
	leaks: string[];
	// Requests made by popup pages to anything but the Cardmax API. Must stay empty.
	popupRequests: string[];
	// Bodies POSTed to listings.search. Each test asserts exactly what it sent.
	apiCalls: unknown[];
	// Device wallet calls: path, the device token header, and the body.
	deviceCalls: { path: string; token: string | null; body: unknown }[];
	// What the mocked account holds; device.wallet.put replaces it.
	accountWallet: { cards: unknown[] | null };
	openStore: (store: Store, path?: string) => Promise<Page>;
	openPopupFor: (page?: Page) => Promise<Page>;
	seedWallet: (cardIds: string[]) => Promise<void>;
};

// The slice of the chrome API the tests call inside the service worker. Typed
// by hand so the e2e files do not depend on WXT's generated globals.
export type SwGlobal = {
	chrome: {
		tabs: {
			query(query: object): Promise<{ id?: number; url?: string }[]>;
		};
		action: {
			getBadgeText(details: { tabId: number }): Promise<string>;
		};
		storage: {
			local: {
				get(keys: null): Promise<Record<string, unknown>>;
				set(items: Record<string, unknown>): Promise<void>;
			};
		};
	};
};

export const test = base.extend<Fixtures>({
	// Playwright reads fixture dependencies from the destructuring pattern, so
	// a fixture with no dependencies must use an empty one.
	// biome-ignore lint/correctness/noEmptyPattern: required by Playwright
	leaks: async ({}, use) => {
		await use([]);
	},
	// biome-ignore lint/correctness/noEmptyPattern: required by Playwright
	popupRequests: async ({}, use) => {
		await use([]);
	},
	// biome-ignore lint/correctness/noEmptyPattern: required by Playwright
	apiCalls: async ({}, use) => {
		await use([]);
	},
	// biome-ignore lint/correctness/noEmptyPattern: required by Playwright
	deviceCalls: async ({}, use) => {
		await use([]);
	},
	// biome-ignore lint/correctness/noEmptyPattern: required by Playwright
	accountWallet: async ({}, use) => {
		await use({ cards: null });
	},

	context: async (
		{ headless, leaks, apiCalls, deviceCalls, accountWallet },
		use,
		testInfo,
	) => {
		const context = await chromium.launchPersistentContext("", {
			// The full Chromium build; its new headless mode can load extensions.
			channel: "chromium",
			headless,
			args: [
				`--disable-extensions-except=${extensionPath}`,
				`--load-extension=${extensionPath}`,
			],
		});
		// Block every request to a non-fixture host and record it as a leak.
		// Routes registered later win, so this catch-all goes first.
		await context.route(
			(url) => url.protocol === "http:" || url.protocol === "https:",
			(route) => {
				leaks.push(route.request().url());
				return route.abort("blockedbyclient");
			},
		);
		for (const host of fixtureHtml.keys()) {
			await context.route(`https://${host}/**`, (route) => {
				const { pathname } = new URL(route.request().url());
				if (pathname !== productPath && pathname !== checkoutPath) {
					return route.fulfill({ status: 404 });
				}
				return route.fulfill({
					contentType: "text/html; charset=utf-8",
					body: fixtureHtml.get(host),
				});
			});
		}
		await context.route(`${apiOrigin}/**`, (route) => {
			const request = route.request();
			if (request.method() === "OPTIONS") {
				return route.fulfill({ status: 204, headers: cors });
			}
			if (request.method() !== "POST") {
				return route.fulfill({ status: 404, headers: cors });
			}
			const reply = (json: unknown) =>
				route.fulfill({
					headers: cors,
					contentType: "application/json",
					body: JSON.stringify({ json }),
				});
			const path = new URL(request.url()).pathname.replace("/api/rpc/", "");
			if (path === "listings/search") {
				apiCalls.push(request.postDataJSON());
				return reply(mockListings);
			}
			if (path === "catalog/list") return reply(mockCatalog);
			if (path.startsWith("device/")) {
				const token = request.headers()["x-cardmax-device"] ?? null;
				const body = request.postDataJSON()?.json;
				deviceCalls.push({ path, token, body });
				if (path === "device/wallet/put") accountWallet.cards = body;
				if (path === "device/unlink") return reply({ ok: true });
				return reply(
					accountWallet.cards
						? { cards: accountWallet.cards, updatedAt: "2026-10-22T00:00:00Z" }
						: null,
				);
			}
			return route.fulfill({ status: 404, headers: cors });
		});
		await context.route(`${webOrigin}/**`, (route) =>
			route.fulfill({ contentType: "text/html", body: webAppHtml }),
		);

		await context.tracing.start({
			screenshots: true,
			snapshots: true,
			sources: true,
		});
		await use(context);

		const failed = testInfo.status !== testInfo.expectedStatus;
		if (failed) {
			for (const [index, page] of context.pages().entries()) {
				const path = testInfo.outputPath(`page-${index}.png`);
				try {
					await page.screenshot({ path });
					await testInfo.attach(`page-${index}`, {
						path,
						contentType: "image/png",
					});
				} catch {
					// A closed or crashed page has nothing to capture.
				}
			}
			const trace = testInfo.outputPath("trace.zip");
			await context.tracing.stop({ path: trace });
			await testInfo.attach("trace", {
				path: trace,
				contentType: "application/zip",
			});
		} else {
			await context.tracing.stop();
		}
		await context.close();
	},

	serviceWorker: async ({ context }, use) => {
		const worker =
			context.serviceWorkers()[0] ??
			(await context.waitForEvent("serviceworker"));
		await use(worker);
	},

	extensionId: async ({ serviceWorker }, use) => {
		await use(new URL(serviceWorker.url()).host);
	},

	openStore: async ({ context }, use) => {
		await use(async (store, path = productPath) => {
			const page = await context.newPage();
			await page.goto(`https://${stores[store]}${path}`);
			return page;
		});
	},

	openPopupFor: async (
		{ context, serviceWorker, extensionId, popupRequests },
		use,
	) => {
		await use(async (page) => {
			let query = "";
			if (page) {
				const tabId = await serviceWorker.evaluate(async (url) => {
					const { chrome } = globalThis as unknown as SwGlobal;
					const tabs = await chrome.tabs.query({});
					return tabs.find((tab) => tab.url === url)?.id;
				}, page.url());
				if (tabId === undefined) throw new Error(`No tab for ${page.url()}`);
				query = `?tab=${tabId}`;
			}
			const popup = await context.newPage();
			popup.on("request", (request) => {
				const url = request.url();
				if (
					!url.startsWith("chrome-extension:") &&
					!url.startsWith(apiOrigin)
				) {
					popupRequests.push(url);
				}
			});
			await popup.goto(`chrome-extension://${extensionId}/popup.html${query}`);
			return popup;
		});
	},

	seedWallet: async ({ serviceWorker }, use) => {
		await use(async (cardIds) => {
			await serviceWorker.evaluate(async (ids) => {
				const { chrome } = globalThis as unknown as SwGlobal;
				const addedAt = new Date().toISOString();
				await chrome.storage.local.set({
					wallet: ids.map((cardId) => ({ cardId, addedAt })),
				});
			}, cardIds);
		});
	},
});

// Privacy assertion for every test: nothing left for a non-fixture host, and
// the popup made no request except to the Cardmax API.
test.afterEach(async ({ leaks, popupRequests }) => {
	expect(leaks, "requests to non-fixture hosts").toEqual([]);
	expect(popupRequests, "requests from the popup").toEqual([]);
});

export { expect };
