import { readFileSync } from "node:fs";
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

// Product path used for every fixture page. The path itself does not matter.
const productPath = "/product/fixture";

type Fixtures = {
	context: BrowserContext;
	serviceWorker: Worker;
	extensionId: string;
	// Requests to any host that is not a fixture. Must stay empty.
	leaks: string[];
	// Requests made by popup pages. With no WXT_API_URL this must stay empty.
	popupRequests: string[];
	openStore: (store: Store) => Promise<Page>;
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

	context: async ({ headless, leaks }, use, testInfo) => {
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
				if (pathname !== productPath) return route.fulfill({ status: 404 });
				return route.fulfill({
					contentType: "text/html; charset=utf-8",
					body: fixtureHtml.get(host),
				});
			});
		}
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
		await use(async (store) => {
			const page = await context.newPage();
			await page.goto(`https://${stores[store]}${productPath}`);
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
				if (!request.url().startsWith("chrome-extension:")) {
					popupRequests.push(request.url());
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
// the popup made no network request at all (no API is configured).
test.afterEach(async ({ leaks, popupRequests }) => {
	expect(leaks, "requests to non-fixture hosts").toEqual([]);
	expect(popupRequests, "requests from the popup").toEqual([]);
});

export { expect };
