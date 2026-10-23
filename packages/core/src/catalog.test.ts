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

const heldOnly = (ids: string[]) =>
	ids.map((cardId) => ({ cardId, addedAt: "2026-10-22T00:00:00Z" }));

const storeCards = [
	"citi-double-cash",
	"wells-fargo-active-cash",
	"chase-freedom-flex",
	"amex-blue-cash-preferred",
	"capital-one-savor",
	"target-circle-card",
	"my-best-buy-credit-card",
	"onepay-cashrewards",
];

test("the top pick differs between Best Buy, Target and Walmart", () => {
	const top = (host: string) =>
		recommend(heldOnly(storeCards), catalog, guessMerchant(host), 100)[0];
	expect(top("www.bestbuy.com")).toMatchObject({
		cardId: "my-best-buy-credit-card",
		multiplier: 5,
		reason: "5% back on bestbuy.com",
	});
	expect(top("www.target.com")).toMatchObject({
		cardId: "target-circle-card",
		multiplier: 5,
	});
	expect(top("www.walmart.com")).toMatchObject({
		cardId: "onepay-cashrewards",
		multiplier: 3,
	});
});

test("store cards pay nothing at other stores", () => {
	const results = recommend(
		heldOnly(["target-circle-card", "citi-double-cash"]),
		catalog,
		guessMerchant("www.walmart.com"),
		100,
	);
	expect(results[0]?.cardId).toBe("citi-double-cash");
	expect(results[1]?.estimatedRewardUsd).toBe(0);
});

test("Walmart and Target stay out of grocery bonuses", () => {
	for (const host of ["www.walmart.com", "www.target.com"]) {
		const merchant = guessMerchant(host, undefined, {
			[host.replace("www.", "")]: "grocery",
		});
		const results = recommend(heldOnly(storeCards), catalog, merchant, 100);
		const savor = results.find((r) => r.cardId === "capital-one-savor");
		const bcp = results.find((r) => r.cardId === "amex-blue-cash-preferred");
		expect(savor?.multiplier).toBe(1);
		expect(bcp?.multiplier).toBe(1);
	}
});
