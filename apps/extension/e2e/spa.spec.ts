import type { Worker } from "@playwright/test";

import { expect, type SwGlobal, test } from "./harness";

// Best Buy moves from cart to /checkout/c/standard with history.pushState, so
// there is no page load. The extension must still notice the checkout.
test("an in-page navigation to checkout sets the badge", async ({
	openStore,
	seedWallet,
	serviceWorker,
}) => {
	await seedWallet(["citi-double-cash", "amex-gold"]);
	const page = await openStore("bestbuy");
	await page.waitForLoadState("load");
	await page.evaluate(() => history.pushState({}, "", "/checkout/c/standard"));
	await expect.poll(() => badge(serviceWorker, page.url())).toBe("2%");
});

async function badge(serviceWorker: Worker, url: string): Promise<string> {
	return serviceWorker.evaluate(async (tabUrl) => {
		const { chrome } = globalThis as unknown as SwGlobal;
		const tabs = await chrome.tabs.query({});
		const tab = tabs.find((t) => t.url === tabUrl);
		if (tab?.id === undefined) return "no tab";
		return chrome.action.getBadgeText({ tabId: tab.id });
	}, url);
}
