import { describe, expect, test } from "bun:test";

import { guessMerchant, normalizeDomain } from "./merchants";

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

	test("defaults to other when nothing matches", () => {
		const guess = guessMerchant("unknown.example", { title: "Welcome" });
		expect(guess.category).toBe("other");
		expect(guess.confidence).toBe("low");
	});
});
