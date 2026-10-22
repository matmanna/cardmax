import { describe, expect, test } from "bun:test";

import {
	guessMerchant,
	merchantMap,
	normalizeDomain,
	supportedStoreDomains,
	supportedStoreOrigins,
} from "./merchants";
import { type Category, category, type MerchantGuess } from "./schema";

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

describe("merchantMap", () => {
	test("covers about 100 merchants in every category", () => {
		const entries = Object.entries(merchantMap);
		expect(entries.length).toBeGreaterThanOrEqual(100);
		const used = new Set(entries.map(([, c]) => c));
		for (const c of category.options)
			if (c !== "other") expect(used).toContain(c);
	});

	test("keys are already normalized domains", () => {
		for (const domain of Object.keys(merchantMap))
			expect(normalizeDomain(domain)).toBe(domain);
	});

	test("spot checks", () => {
		expect(merchantMap["chick-fil-a.com"]).toBe("dining");
		expect(merchantMap["hilton.com"]).toBe("travel");
		expect(merchantMap["exxon.com"]).toBe("gas");
		expect(merchantMap["disneyplus.com"]).toBe("streaming");
		expect(merchantMap["publix.com"]).toBe("grocery");
		expect(merchantMap["target.com"]).toBe("online_retail");
		expect(merchantMap["walmart.com"]).toBe("online_retail");
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

describe("guessMerchant on checkout and payment hosts", () => {
	test("names the real merchant behind a Shopify checkout", () => {
		expect(
			guessMerchant("checkout.shopify.com", {
				title: "Checkout - Allbirds",
				siteName: "Allbirds",
				types: ["Product"],
			}),
		).toEqual({
			domain: "shopify.com",
			category: "online_retail",
			confidence: "low",
			source: "structured_data",
			label: "Allbirds",
			via: "shopify",
		});
	});

	test("uses the JSON-LD seller, then brand, on a myshopify store", () => {
		const guess = guessMerchant("acme.myshopify.com", {
			seller: "Acme Coffee",
			brand: "Acme",
			types: ["CafeOrCoffeeShop"],
		});
		expect(guess.domain).toBe("acme.myshopify.com");
		expect(guess.label).toBe("Acme Coffee");
		expect(guess.category).toBe("dining");
		expect(guess.confidence).toBe("low");
		expect(guess.via).toBe("shopify");
		expect(guessMerchant("acme.myshopify.com", { brand: "Acme" }).label).toBe(
			"Acme",
		);
	});

	test("falls back to the title and its keywords on Stripe", () => {
		const guess = guessMerchant("checkout.stripe.com", {
			title: "Joe's Pizza | Pay with Stripe",
		});
		expect(guess.label).toBe("Joe's Pizza");
		expect(guess.category).toBe("dining");
		expect(guess.source).toBe("page_heuristic");
		expect(guess.via).toBe("stripe");
	});

	test("never takes the category from the payment host itself", () => {
		const guess = guessMerchant("www.paypal.com", {
			title: "PayPal Checkout - Place order",
			siteName: "PayPal",
		});
		expect(guess).toEqual({
			domain: "paypal.com",
			category: "other",
			confidence: "low",
			source: "page_heuristic",
			via: "paypal",
		});
	});

	test("recognizes every supported host", () => {
		const hosts: [string, MerchantGuess["via"]][] = [
			["pay.google.com", "google_pay"],
			["checkout.square.site", "square"],
			["checkout.squareup.com", "square"],
			["buy.stripe.com", "stripe"],
		];
		for (const [host, via] of hosts) expect(guessMerchant(host).via).toBe(via);
		expect(guessMerchant("www.shopify.com").via).toBeUndefined();
	});

	test("a user override still wins", () => {
		const guess = guessMerchant(
			"acme.myshopify.com",
			{ types: ["Product"] },
			{ "acme.myshopify.com": "dining" },
		);
		expect(guess.category).toBe("dining");
		expect(guess.source).toBe("user_override");
	});
});

describe("supportedStoreOrigins", () => {
	test("covers every curated store, subdomains included", () => {
		expect(supportedStoreOrigins).toHaveLength(supportedStoreDomains.length);
		expect(supportedStoreOrigins).toContain("https://*.bestbuy.com/*");
		expect(supportedStoreOrigins).toContain("https://*.amazon.com/*");
	});
});

describe("guessMerchant with a pulled store list", () => {
	test("uses the given map instead of the bundled one", () => {
		const guess = guessMerchant(
			"www.newstore.com",
			undefined,
			{},
			{
				"newstore.com": "grocery",
			},
		);
		expect(guess).toMatchObject({ category: "grocery", source: "curated" });
	});
});
