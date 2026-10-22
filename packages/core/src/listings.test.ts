import { expect, test } from "bun:test";

import { rankListings } from "./listings";
import type { CardProduct, Listing } from "./schema";

const catalog: CardProduct[] = [
	{
		id: "store-5",
		issuer: "Test Bank",
		name: "Store 5%",
		rewardCurrency: "cash",
		annualFeeUsd: 0,
		baseMultiplier: 1,
		rules: [
			{
				category: "online_retail",
				multiplier: 5,
				excludesMerchants: [],
				onlyMerchants: ["walmart.com"],
			},
		],
		sourceUrl: "https://example.com/store",
		checkedOn: "2026-10-22",
	},
];

const listings: Listing[] = [
	{
		merchant: "bestbuy",
		domain: "www.bestbuy.com",
		title: "Acme TV",
		priceUsd: 100,
		url: "https://www.bestbuy.com/acme",
	},
	{
		merchant: "walmart",
		domain: "www.walmart.com",
		title: "Acme TV",
		priceUsd: 103,
		url: "https://www.walmart.com/acme",
	},
];

test("ranks by price minus the best card's reward", () => {
	const ranked = rankListings(
		listings,
		[{ cardId: "store-5", addedAt: "2026-10-22T00:00:00Z" }],
		catalog,
	);
	// Walmart lists higher, but 5% back makes it cheaper: 103 - 5.15 = 97.85.
	expect(ranked.map((r) => r.listing.merchant)).toEqual(["walmart", "bestbuy"]);
	expect(ranked[0]?.netPriceUsd).toBeCloseTo(97.85);
	expect(ranked[0]?.best?.cardId).toBe("store-5");
	expect(ranked[1]?.netPriceUsd).toBe(99);
});
