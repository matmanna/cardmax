import { describe, expect, test } from "bun:test";

import { guessMerchant, normalizeDomain } from "./merchants";
import type { Category } from "./schema";

describe("normalizeDomain", () => {
	test("strips www and subdomains", () => {
		expect(normalizeDomain("www.bestbuy.com")).toBe("bestbuy.com");
		expect(normalizeDomain("smile.amazon.com")).toBe("amazon.com");
		expect(normalizeDomain("BestBuy.com.")).toBe("bestbuy.com");
	});

	test("keeps the label before a multi-part public suffix", () => {
		expect(normalizeDomain("www.amazon.co.uk")).toBe("amazon.co.uk");
		expect(normalizeDomain("amazon.com.au")).toBe("amazon.com.au");
		expect(normalizeDomain("m.rakuten.co.jp")).toBe("rakuten.co.jp");
		expect(normalizeDomain("co.uk")).toBe("co.uk");
	});

	test("strips shop, order, checkout, and secure subdomains", () => {
		expect(normalizeDomain("shop.nike.com")).toBe("nike.com");
		expect(normalizeDomain("order.dominos.com")).toBe("dominos.com");
		expect(normalizeDomain("secure.checkout.example.co.uk")).toBe(
			"example.co.uk",
		);
	});

	test("treats each Shopify store as its own domain", () => {
		expect(normalizeDomain("acme.myshopify.com")).toBe("acme.myshopify.com");
	});
});

describe("guessMerchant", () => {
	test("uses the curated map with high confidence", () => {
		expect(guessMerchant("www.costco.com")).toEqual({
			domain: "costco.com",
			category: "warehouse_club",
			confidence: "high",
			source: "curated",
		});
	});

	test("a user override beats the curated map", () => {
		const guess = guessMerchant("www.costco.com", undefined, {
			"costco.com": "grocery",
		});
		expect(guess.category).toBe("grocery");
		expect(guess.source).toBe("user_override");
	});

	test("falls back to page signals with low confidence", () => {
		const guess = guessMerchant("www.joes-diner.example", {
			title: "Joe's Diner - Order Online",
			description: "Burgers and fries. View our menu and order takeout.",
		});
		expect(guess.category).toBe("dining");
		expect(guess.source).toBe("page_heuristic");
		expect(guess.confidence).toBe("low");
	});

	test("maps schema.org business types with medium confidence", () => {
		const cases: [string, string][] = [
			["Restaurant", "dining"],
			["CafeOrCoffeeShop", "dining"],
			["FastFoodRestaurant", "dining"],
			["GroceryStore", "grocery"],
			["GasStation", "gas"],
			["Pharmacy", "drugstore"],
			["Hotel", "travel"],
			["FlightReservation", "travel"],
		];
		for (const [type, category] of cases) {
			expect(
				guessMerchant("local.example", { types: ["WebSite", type] }),
			).toEqual({
				domain: "local.example",
				category: category as Category,
				confidence: "medium",
				source: "structured_data",
			});
		}
	});

	test("structured data beats keywords", () => {
		const guess = guessMerchant("corner.example", {
			title: "Corner Pharmacy - order takeout",
			types: ["Pharmacy"],
		});
		expect(guess.category).toBe("drugstore");
		expect(guess.source).toBe("structured_data");
	});

	test("a business type beats a product on the same page", () => {
		const guess = guessMerchant("bakery.example", {
			types: ["Product", "Bakery"],
		});
		expect(guess.category).toBe("dining");
	});

	test("a product or offer page on an unmapped shop is online retail", () => {
		for (const types of [["Product"], ["Offer"]]) {
			const guess = guessMerchant("boutique.example", { types });
			expect(guess.category).toBe("online_retail");
			expect(guess.confidence).toBe("medium");
		}
		expect(
			guessMerchant("boutique.example", { ogType: "product" }).category,
		).toBe("online_retail");
	});

	test("the curated map beats structured data", () => {
		const guess = guessMerchant("www.costco.com", { types: ["Product"] });
		expect(guess.category).toBe("warehouse_club");
		expect(guess.source).toBe("curated");
	});

	test("cart and checkout phrases are weak online retail hints", () => {
		for (const title of ["Place order", "Order summary", "Shipping address"]) {
			const guess = guessMerchant("store.example", { title });
			expect(guess.category).toBe("online_retail");
			expect(guess.confidence).toBe("low");
			expect(guess.source).toBe("page_heuristic");
		}
	});

	test("defaults to other when nothing matches", () => {
		const guess = guessMerchant("unknown.example", { title: "Welcome" });
		expect(guess.category).toBe("other");
		expect(guess.confidence).toBe("low");
	});
});
