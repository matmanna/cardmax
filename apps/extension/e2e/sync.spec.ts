import type { Page } from "@playwright/test";

import {
	checkoutPath,
	expect,
	pulledCardName,
	type SwGlobal,
	test,
	webOrigin,
} from "./harness";

type RuntimeGlobal = {
	chrome?: {
		runtime?: {
			sendMessage?: (id: string, message: unknown) => Promise<unknown>;
		};
	};
};

function sendFrom(page: Page, extensionId: string, message: unknown) {
	return page.evaluate(
		([id, msg]) =>
			(globalThis as RuntimeGlobal).chrome?.runtime?.sendMessage?.(id, msg),
		[extensionId, message] as const,
	);
}

const token = "t".repeat(43);

test.describe("account sync", () => {
	test("connecting merges both wallets and pushes with the device token", async ({
		context,
		extensionId,
		seedWallet,
		accountWallet,
		deviceCalls,
		openPopupFor,
	}) => {
		await seedWallet(["citi-double-cash"]);
		accountWallet.cards = [
			{ cardId: "amex-gold", addedAt: "2026-10-01T00:00:00Z" },
		];
		const web = await context.newPage();
		await web.goto(`${webOrigin}/`);

		expect(
			await sendFrom(web, extensionId, {
				type: "cardmax:connect",
				token,
				email: "sam@example.com",
			}),
		).toEqual({ ok: true });

		// The account ends up with both cards, sent with the device token only.
		expect(
			(accountWallet.cards as { cardId: string }[]).map((c) => c.cardId).sort(),
		).toEqual(["amex-gold", "citi-double-cash"]);
		expect(deviceCalls.every((call) => call.token === token)).toBe(true);

		const popup = await openPopupFor();
		await popup.getByRole("button", { name: /Wallet/ }).click();
		await expect(popup.getByText("Synced with sam@example.com")).toBeVisible();

		// A change in the popup goes up to the account.
		await popup.getByRole("checkbox", { name: /Freedom Unlimited/ }).click();
		await expect
			.poll(() => (accountWallet.cards as { cardId: string }[]).length)
			.toBe(3);

		// Disconnect drops the token on both sides.
		await popup.getByRole("button", { name: "Disconnect" }).click();
		await expect(popup.getByText("Only on this device")).toBeVisible();
		expect(deviceCalls.at(-1)?.path).toBe("device/unlink");
	});

	test("the popup uses the catalog pulled from the API", async ({
		openPopupFor,
		openStore,
		seedWallet,
	}) => {
		await seedWallet(["wells-fargo-active-cash"]);
		const store = await openStore("bestbuy");
		// The first open triggers the pull; the second shows the pulled data.
		await (await openPopupFor(store)).close();
		const popup = await openPopupFor(store);
		await expect(
			popup.getByText(`Wells Fargo ${pulledCardName}`),
		).toBeVisible();
	});

	test("an empty wallet still flags checkout so the user can add cards", async ({
		openStore,
		serviceWorker,
	}) => {
		const page = await openStore("bestbuy", checkoutPath);
		await expect
			.poll(() =>
				serviceWorker.evaluate(async (url) => {
					const { chrome } = globalThis as unknown as SwGlobal;
					const tab = (await chrome.tabs.query({})).find((t) => t.url === url);
					return tab?.id === undefined
						? "no tab"
						: chrome.action.getBadgeText({ tabId: tab.id });
				}, page.url()),
			)
			.toBe("+");
	});
});

test("an auto-opened popup shows the checkout the background read", async ({
	context,
	extensionId,
	seedWallet,
	serviceWorker,
}) => {
	await seedWallet(["citi-double-cash"]);
	// A tab Cardmax can't read or even see the URL of, like an auto-opened
	// popup's tab without an activeTab grant.
	const page = await context.newPage();
	await page.goto(`${webOrigin}/`);
	await page.bringToFront();
	const tabId = await serviceWorker.evaluate(async () => {
		const { chrome } = globalThis as unknown as SwGlobal & {
			chrome: { storage: { session: { set(v: object): Promise<void> } } };
		};
		const [tab] = await chrome.tabs.query({ active: true });
		await chrome.storage.session.set({
			[`context:${tab?.id}`]: {
				url: "https://www.bestbuy.com/checkout/c/standard",
				raw: { jsonLd: [], meta: {}, title: "Checkout – Best Buy" },
			},
		});
		return tab?.id;
	});

	const popup = await context.newPage();
	await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=${tabId}`);
	await expect(popup.getByText("bestbuy.com", { exact: true })).toBeVisible();
	await expect(popup.getByText("Citi Double Cash")).toBeVisible();
});
