import { expect, test } from "bun:test";

import { catalog } from "./catalog";
import { guessMerchant } from "./merchants";
import { recommend } from "./recommend";
import { cardProduct } from "./schema";

test("every catalog entry passes the schema", () => {
	for (const card of catalog)
		expect(cardProduct.safeParse(card).success).toBe(true);
});

test("card ids are unique", () => {
	expect(new Set(catalog.map((card) => card.id)).size).toBe(catalog.length);
});

const everyCard = catalog.map((card) => ({
	cardId: card.id,
	addedAt: "2026-10-22T00:00:00Z",
}));

test("Prime Visa wins at Amazon", () => {
	const [best] = recommend(
		everyCard,
		catalog,
		guessMerchant("www.amazon.com"),
		100,
	);
	expect(best?.cardId).toBe("chase-prime-visa");
});

test("Amex grocery bonuses skip warehouse clubs even when overridden", () => {
	const merchant = guessMerchant("www.costco.com", undefined, {
		"costco.com": "grocery",
	});
	const results = recommend(everyCard, catalog, merchant, 100);
	const multiplier = (id: string) =>
		results.find((r) => r.cardId === id)?.multiplier;
	expect(multiplier("amex-gold")).toBe(1);
	expect(multiplier("amex-blue-cash-preferred")).toBe(1);
});
