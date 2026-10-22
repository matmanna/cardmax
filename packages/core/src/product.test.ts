import { describe, expect, test } from "bun:test";

import { parseProduct, toListingQuery } from "./product";

const jsonLd = JSON.stringify({
	"@context": "https://schema.org",
	"@graph": [
		{ "@type": "BreadcrumbList" },
		{
			"@type": "Product",
			name: "Acme 55-inch TV",
			gtin13: "0012345678905",
			offers: { "@type": "Offer", price: "299.99", priceCurrency: "USD" },
		},
	],
});

describe("parseProduct", () => {
	test("reads name, GTIN, and price from JSON-LD", () => {
		expect(parseProduct({ jsonLd: [jsonLd], meta: {}, title: "x" })).toEqual({
			title: "Acme 55-inch TV",
			upc: "0012345678905",
			priceUsd: 299.99,
		});
	});

	test("survives broken JSON-LD and falls back to meta tags", () => {
		expect(
			parseProduct({
				jsonLd: ["{not json"],
				meta: { "og:title": "Acme TV", "product:price:amount": "$1,049.00" },
				title: "Acme TV | Shop",
			}),
		).toEqual({ title: "Acme TV", upc: undefined, priceUsd: 1049 });
	});

	test("returns null when the page has no product", () => {
		expect(parseProduct({ jsonLd: [], meta: {}, title: "" })).toBeNull();
	});
});

describe("toListingQuery", () => {
	test("sends only the UPC when there is one", () => {
		expect(
			toListingQuery({ title: "Acme TV", upc: "012345678905", priceUsd: 1 }),
		).toEqual({ upc: "012345678905" });
	});

	test("sends a trimmed title otherwise", () => {
		expect(toListingQuery({ title: "  Acme TV  ", priceUsd: 1 })).toEqual({
			title: "Acme TV",
		});
	});
});
