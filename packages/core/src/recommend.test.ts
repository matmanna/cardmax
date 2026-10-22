import { describe, expect, test } from "bun:test";

import { recommend } from "./recommend";
import type { CardProduct, MerchantGuess, WalletCard } from "./schema";

const flat: CardProduct = {
	id: "flat-2",
	issuer: "Test Bank",
	name: "Flat 2%",
	rewardCurrency: "cash",
	annualFeeUsd: 0,
	baseMultiplier: 2,
	rules: [],
	sourceUrl: "https://example.com/flat",
	checkedOn: "2026-10-22",
};

const grocer: CardProduct = {
	id: "grocer-4x",
	issuer: "Test Bank",
	name: "Grocer 4x",
	rewardCurrency: "points",
	annualFeeUsd: 250,
	baseMultiplier: 1,
	rules: [
		{
			category: "grocery",
			multiplier: 4,
			capUsd: 25000,
			excludesMerchants: ["walmart.com"],
		},
	],
	sourceUrl: "https://example.com/grocer",
	checkedOn: "2026-10-22",
};

const store: CardProduct = {
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
			onlyMerchants: ["amazon.com"],
		},
	],
	sourceUrl: "https://example.com/store",
	checkedOn: "2026-10-22",
};

const catalog = [flat, grocer, store];
const wallet: WalletCard[] = catalog.map((card) => ({
	cardId: card.id,
	addedAt: "2026-10-22T00:00:00Z",
}));

function merchant(
	domain: string,
	category: MerchantGuess["category"],
): MerchantGuess {
	return { domain, category, confidence: "high", source: "curated" };
}

describe("recommend", () => {
	test("ranks a category bonus above a flat card", () => {
		const [best] = recommend(
			wallet,
			catalog,
			merchant("kroger.com", "grocery"),
			100,
		);
		expect(best?.cardId).toBe("grocer-4x");
		expect(best?.estimatedRewardUsd).toBe(4);
	});

	test("skips a bonus when the merchant is excluded", () => {
		const results = recommend(
			wallet,
			catalog,
			merchant("walmart.com", "grocery"),
			100,
		);
		expect(results[0]?.cardId).toBe("flat-2");
		expect(results.find((r) => r.cardId === "grocer-4x")?.multiplier).toBe(1);
	});

	test("applies merchant-only rules to that merchant only", () => {
		const atAmazon = recommend(
			wallet,
			catalog,
			merchant("amazon.com", "online_retail"),
			100,
		);
		expect(atAmazon[0]?.cardId).toBe("store-5");

		const elsewhere = recommend(
			wallet,
			catalog,
			merchant("bestbuy.com", "online_retail"),
			100,
		);
		expect(elsewhere.find((r) => r.cardId === "store-5")?.multiplier).toBe(1);
	});

	test("values cash back at 1 cent whatever the point valuation", () => {
		const results = recommend(
			wallet,
			catalog,
			merchant("kroger.com", "grocery"),
			100,
			2,
		);
		expect(results.find((r) => r.cardId === "flat-2")?.estimatedRewardUsd).toBe(
			2,
		);
		expect(
			results.find((r) => r.cardId === "grocer-4x")?.estimatedRewardUsd,
		).toBe(8);
	});

	test("mentions the annual cap in the reason", () => {
		const [best] = recommend(
			wallet,
			catalog,
			merchant("kroger.com", "grocery"),
			100,
		);
		expect(best?.reason).toContain("$25,000");
	});

	test("only ranks cards in the wallet", () => {
		const results = recommend(
			[{ cardId: "flat-2", addedAt: "2026-10-22T00:00:00Z" }],
			catalog,
			merchant("kroger.com", "grocery"),
			100,
		);
		expect(results.map((r) => r.cardId)).toEqual(["flat-2"]);
	});
});

describe("reason wording", () => {
	test("says percent for cash back and x for points", () => {
		const results = recommend(
			wallet,
			catalog,
			merchant("kroger.com", "grocery"),
			100,
		);
		const reason = (id: string) => results.find((r) => r.cardId === id)?.reason;
		expect(reason("flat-2")).toBe("2% back on everything");
		expect(reason("grocer-4x")).toBe(
			"4x points on grocery (up to $25,000 a year)",
		);
	});
});
