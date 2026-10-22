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
		accountWallet.cards = [{ cardId: "amex-gold", addedAt: "2026-10-01T00:00:00Z" }];
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
		await expect(popup.getByText(`Wells Fargo ${pulledCardName}`)).toBeVisible();
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
