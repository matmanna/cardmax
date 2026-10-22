import type { Page, Worker } from "@playwright/test";

import {
	checkoutPath,
	expect,
	listingsUrl,
	type SwGlobal,
	test,
} from "./harness";

// From e2e/fixtures/bestbuy.html.
const bestBuyGtin = "0012345678905";

// The payload panel shows the exact object that would leave the device.
async function payload(popup: Page): Promise<unknown> {
	await expect(popup.getByText(/^Sends to /)).toBeVisible();
	const text = await popup.getByText(/^\s*\{[\s\S]*\}\s*$/).textContent();
	return JSON.parse(text ?? "");
}

test.describe("wallet", () => {
	test("quick clicks on two cards save both", async ({ openPopupFor }) => {
		const popup = await openPopupFor();
		await popup.getByRole("checkbox", { name: /Double Cash/ }).click();
		await popup.getByRole("checkbox", { name: /Gold Card/ }).click();
		await expect(
			popup.getByRole("button", { name: "Wallet (2)" }),
		).toBeVisible();
	});

	test("empty wallet on a non-store page lands on the Wallet tab and added cards persist", async ({
		openPopupFor,
	}) => {
		const popup = await openPopupFor();
		await expect(
			popup.getByRole("button", { name: /Wallet/, pressed: true }),
		).toBeVisible();

		// The checkboxes are controlled by stored state and flip only after the
		// async save, so click and then wait, rather than check().
		const doubleCash = popup.getByRole("checkbox", { name: /Double Cash/ });
		const gold = popup.getByRole("checkbox", { name: /Gold Card/ });
		await doubleCash.click();
		await expect(doubleCash).toBeChecked();
		await gold.click();
		await expect(gold).toBeChecked();
		await expect(
			popup.getByRole("button", { name: "Wallet (2)" }),
		).toBeVisible();
		await popup.close();

		const reopened = await openPopupFor();
		// With cards held, the popup opens on "This page" instead.
		await expect(
			reopened.getByRole("button", { name: "This page", pressed: true }),
		).toBeVisible();
		await reopened.getByRole("button", { name: "Wallet (2)" }).click();
		await expect(
			reopened.getByRole("checkbox", { name: /Double Cash/ }),
		).toBeChecked();
		await expect(
			reopened.getByRole("checkbox", { name: /Gold Card/ }),
		).toBeChecked();
	});

	test("revoke clears the wallet and turns sends off", async ({
		openPopupFor,
		openStore,
		seedWallet,
		serviceWorker,
	}) => {
		await seedWallet(["citi-double-cash", "amex-gold"]);
		const store = await openStore("bestbuy");
		const popup = await openPopupFor(store);

		await popup.getByRole("button", { name: "Wallet (2)" }).click();
		await popup
			.getByRole("button", { name: "Stop all sends and delete my data" })
			.click();
		await expect(
			popup.getByText("Sends are off and local data is deleted."),
		).toBeVisible();
		await expect(
			popup.getByRole("button", { name: "Wallet (0)" }),
		).toBeVisible();
		await expect(
			popup.getByRole("checkbox", { name: /Double Cash/ }),
		).not.toBeChecked();

		const stored = await serviceWorker.evaluate(() =>
			(globalThis as unknown as SwGlobal).chrome.storage.local.get(null),
		);
		expect(stored).toEqual({
			settings: { sendsEnabled: false, centsPerPoint: 1, overrides: {} },
		});

		// The page tab offers no lookup while sends are off.
		await popup.getByRole("button", { name: "This page" }).click();
		await expect(popup.getByText("Sends are off.")).toBeVisible();
		await expect(
			popup.getByRole("button", { name: "Compare at other stores" }),
		).toHaveCount(0);
	});
});

test.describe("starting tab", () => {
	const pressed = (popup: Page, name: string | RegExp) =>
		popup.getByRole("button", { name, pressed: true });

	test("store page with an empty wallet starts on This page and points to Wallet", async ({
		openPopupFor,
		openStore,
	}) => {
		const popup = await openPopupFor(await openStore("bestbuy"));
		await expect(pressed(popup, "This page")).toBeVisible();
		await popup.getByRole("button", { name: "Add your cards" }).click();
		await expect(pressed(popup, /^Wallet/)).toBeVisible();
	});

	test("store page with a wallet starts on This page", async ({
		openPopupFor,
		openStore,
		seedWallet,
	}) => {
		await seedWallet(["citi-double-cash"]);
		const popup = await openPopupFor(await openStore("bestbuy"));
		await expect(pressed(popup, "This page")).toBeVisible();
	});

	test("a checkout page with an empty wallet starts on This page", async ({
		openPopupFor,
		openStore,
	}) => {
		const popup = await openPopupFor(await openStore("bestbuy", checkoutPath));
		await expect(pressed(popup, "This page")).toBeVisible();
	});

	test("a non-store page with an empty wallet starts on Wallet", async ({
		openPopupFor,
	}) => {
		const popup = await openPopupFor();
		await expect(pressed(popup, /^Wallet/)).toBeVisible();
	});

	test("a wallet syncing in after open does not move the tab", async ({
		openPopupFor,
		openStore,
		accountWallet,
	}) => {
		const popup = await openPopupFor(await openStore("bestbuy"));
		await popup.getByRole("button", { name: /^Wallet/ }).click();
		await expect(pressed(popup, /^Wallet/)).toBeVisible();

		// A later reload (a card toggle) with a synced-in wallet keeps the tab.
		accountWallet.cards = [
			{ cardId: "amex-gold", addedAt: "2026-10-01T00:00:00Z" },
		];
		await popup.getByRole("checkbox", { name: /Double Cash/ }).click();
		await expect(
			popup.getByRole("checkbox", { name: /Double Cash/ }),
		).toBeChecked();
		await expect(pressed(popup, /^Wallet/)).toBeVisible();
	});
});

test.describe("recommendation", () => {
	test.beforeEach(async ({ seedWallet }) => {
		await seedWallet(["citi-double-cash", "amex-gold"]);
	});

	test("Best Buy: Citi Double Cash, price prefilled, bestbuy.com high confidence", async ({
		openPopupFor,
		openStore,
	}) => {
		const popup = await openPopupFor(await openStore("bestbuy"));

		await expect(popup.getByText("bestbuy.com", { exact: true })).toBeVisible();
		await expect(popup.getByText("high confidence")).toBeAttached();
		await expect(popup.getByLabel("Amount")).toHaveValue("349.99");
		await expect(popup.getByRole("main")).toContainText(
			/Pay with\s*Citi Double Cash\s*\+\$7\.00/,
		);
		await expect(popup.getByText("Gold Card")).toBeVisible();
	});

	test("overriding the category to grocery changes the pick and keeps the typed amount", async ({
		openPopupFor,
		openStore,
	}) => {
		const popup = await openPopupFor(await openStore("bestbuy"));
		const amount = popup.getByLabel("Amount");
		await expect(amount).toHaveValue("349.99");
		await amount.fill("500");
		await expect(popup.getByRole("main")).toContainText(
			/Pay with\s*Citi Double Cash\s*\+\$10\.00/,
		);

		await popup
			.getByRole("combobox", { name: /codes as/i })
			.selectOption("grocery");

		await expect(popup.getByRole("main")).toContainText(
			/Pay with\s*American Express Gold Card\s*\+\$20\.00/,
		);
		await expect(amount).toHaveValue("500");
	});

	test("Costco codes as warehouse club and excludes the Gold grocery bonus", async ({
		openPopupFor,
		openStore,
	}) => {
		const popup = await openPopupFor(await openStore("costco"));
		await expect(popup.getByText("costco.com", { exact: true })).toBeVisible();
		await expect(
			popup.getByRole("combobox", { name: /codes as/i }),
		).toHaveValue("warehouse_club");
		await expect(popup.getByLabel("Amount")).toHaveValue("249.99");

		await popup
			.getByRole("combobox", { name: /codes as/i })
			.selectOption("grocery");
		await expect(popup.getByRole("main")).toContainText(
			/Pay with\s*Citi Double Cash\s*\+\$5\.00/,
		);
	});

	test("Amazon page with no product data still gets a card pick", async ({
		openPopupFor,
		openStore,
	}) => {
		const popup = await openPopupFor(await openStore("amazon"));
		await expect(popup.getByText("amazon.com", { exact: true })).toBeVisible();
		await expect(popup.getByText("high confidence")).toBeAttached();
		// No price on the page, so the default amount stays.
		await expect(popup.getByLabel("Amount")).toHaveValue("100");
		await expect(popup.getByRole("main")).toContainText(
			/Pay with\s*Citi Double Cash\s*\+\$2\.00/,
		);
		// No product, so nothing to compare.
		await expect(
			popup.getByRole("button", { name: "Compare at other stores" }),
		).toHaveCount(0);
	});
});

test.describe("compare at other stores", () => {
	test.beforeEach(async ({ seedWallet }) => {
		await seedWallet(["citi-double-cash", "amex-gold"]);
	});

	test("Best Buy sends the UPC only, Cancel sends nothing, and Send ranks the API's listings", async ({
		openPopupFor,
		openStore,
		apiCalls,
	}) => {
		const popup = await openPopupFor(await openStore("bestbuy"));
		const compare = popup.getByRole("button", {
			name: "Compare at other stores",
		});

		await compare.click();
		expect(await payload(popup)).toEqual({ upc: bestBuyGtin });
		await expect(popup.getByText(`Sends to ${listingsUrl}`)).toBeVisible();

		await popup.getByRole("button", { name: "Cancel" }).click();
		await expect(popup.getByText(/^Sends to /)).toHaveCount(0);
		await expect(compare).toBeVisible();
		expect(apiCalls).toEqual([]);

		await compare.click();
		await popup.getByRole("button", { name: "Send" }).click();
		// Walmart lists lower and Double Cash pays 2% at both, so it ranks first.
		const listings = popup.getByRole("list").last();
		await expect(listings.getByRole("listitem").first()).toContainText(
			"walmart.com",
		);
		await expect(
			popup.getByRole("link", { name: "bestbuy.com" }),
		).toBeVisible();
		await expect(popup.getByText("$339.00 list")).toBeVisible();
		// Exactly the payload shown, in oRPC's envelope, and nothing else.
		expect(apiCalls).toEqual([{ json: { upc: bestBuyGtin } }]);
	});

	test("Walmart meta-tag page sends the title only", async ({
		openPopupFor,
		openStore,
	}) => {
		const popup = await openPopupFor(await openStore("walmart"));
		await expect(popup.getByText("walmart.com", { exact: true })).toBeVisible();
		await expect(popup.getByLabel("Amount")).toHaveValue("129");

		await popup
			.getByRole("button", { name: "Compare at other stores" })
			.click();
		expect(await payload(popup)).toEqual({ title: "Acme Stand Mixer, 5 Qt" });
	});

	test("Costco product without a GTIN sends the title only", async ({
		openPopupFor,
		openStore,
	}) => {
		const popup = await openPopupFor(await openStore("costco"));
		await popup
			.getByRole("button", { name: "Compare at other stores" })
			.click();
		expect(await payload(popup)).toEqual({ title: "Acme Robot Vacuum" });
	});
});

test.describe("automatic on this site", () => {
	test.beforeEach(async ({ seedWallet }) => {
		await seedWallet(["citi-double-cash", "amex-gold"]);
	});

	test("known stores offer one switch for every supported store", async ({
		openPopupFor,
		openStore,
	}) => {
		// The e2e build grants only the four fixture hosts, not the whole list,
		// so the supported-stores switch reads as off.
		const popup = await openPopupFor(await openStore("bestbuy"));
		const toggle = popup.getByRole("switch", {
			name: "Open at checkout on supported stores",
		});
		await expect(toggle).toHaveAttribute("aria-checked", "false");
	});

	test("a checkout page sets the toolbar badge to the best card", async ({
		openStore,
		serviceWorker,
		apiCalls,
	}) => {
		const page = await openStore("bestbuy", checkoutPath);
		await expect.poll(() => badgeFor(serviceWorker, page.url())).toBe("2%");
		expect(apiCalls).toEqual([]);
	});

	test("a product page leaves the badge empty", async ({
		openStore,
		serviceWorker,
	}) => {
		const page = await openStore("bestbuy");
		await page.waitForLoadState("load");
		expect(await badgeFor(serviceWorker, page.url())).toBe("");
	});
});

async function badgeFor(serviceWorker: Worker, url: string): Promise<string> {
	return serviceWorker.evaluate(async (tabUrl) => {
		const { chrome } = globalThis as unknown as SwGlobal;
		const tabs = await chrome.tabs.query({});
		const tab = tabs.find((t) => t.url === tabUrl);
		if (tab?.id === undefined) return "no tab";
		return chrome.action.getBadgeText({ tabId: tab.id });
	}, url);
}

test.describe("auto-open at checkout", () => {
	test.beforeEach(async ({ seedWallet }) => {
		await seedWallet(["citi-double-cash", "amex-gold"]);
	});

	// Playwright can't see a toolbar popup as a page, so this checks the
	// background's once-per-tab record. openPopup itself was verified by hand.
	test("checkout marks the tab as opened, and a product page does not", async ({
		openStore,
		serviceWorker,
	}) => {
		const product = await openStore("bestbuy");
		await product.waitForLoadState("load");
		const checkout = await openStore("bestbuy", checkoutPath);
		await expect
			.poll(() => openedFlag(serviceWorker, checkout.url()))
			.toBe(true);
		expect(await openedFlag(serviceWorker, product.url())).toBe(false);
	});
});

async function openedFlag(serviceWorker: Worker, url: string) {
	return serviceWorker.evaluate(async (tabUrl) => {
		const { chrome } = globalThis as unknown as SwGlobal & {
			chrome: {
				storage: {
					session: { get(key: string): Promise<Record<string, unknown>> };
				};
			};
		};
		const tabs = await chrome.tabs.query({});
		const tab = tabs.find((t) => t.url === tabUrl);
		if (tab?.id === undefined) return false;
		const key = `opened:${tab.id}:checkout`;
		return Boolean((await chrome.storage.session.get(key))[key]);
	}, url);
}
