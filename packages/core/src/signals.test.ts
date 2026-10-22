import { describe, expect, test } from "bun:test";

import { signalsFromPage } from "./signals";

describe("signalsFromPage", () => {
	test("reads title, description, and Open Graph fields", () => {
		expect(
			signalsFromPage({
				jsonLd: [],
				meta: {
					description: "Fresh bread daily",
					"og:site_name": "Joe's Bakery",
					"og:type": "website",
				},
				title: "Joe's Bakery",
			}),
		).toEqual({
			title: "Joe's Bakery",
			description: "Fresh bread daily",
			siteName: "Joe's Bakery",
			ogType: "website",
			types: [],
		});
	});

	test("falls back to og:description and drops empty strings", () => {
		const signals = signalsFromPage({
			jsonLd: [],
			meta: { "og:description": "From OG", "og:site_name": "  " },
			title: "",
		});
		expect(signals.title).toBeUndefined();
		expect(signals.description).toBe("From OG");
		expect(signals.siteName).toBeUndefined();
	});

	test("collects every @type from @graph, arrays, and multi-typed nodes", () => {
		const signals = signalsFromPage({
			jsonLd: [
				JSON.stringify({
					"@context": "https://schema.org",
					"@graph": [
						{ "@type": "WebSite" },
						{ "@type": ["Restaurant", "LocalBusiness"] },
					],
				}),
				JSON.stringify([
					{ "@type": "BreadcrumbList" },
					{ "@type": "https://schema.org/Restaurant" },
				]),
				"{not json",
			],
			meta: {},
			title: "x",
		});
		expect(signals.types).toEqual([
			"WebSite",
			"Restaurant",
			"LocalBusiness",
			"BreadcrumbList",
		]);
	});

	test("reads brand and seller names from a product", () => {
		const signals = signalsFromPage({
			jsonLd: [
				JSON.stringify({
					"@type": "Product",
					name: "Wool Runner",
					brand: { "@type": "Brand", name: "Allbirds" },
					offers: [
						{
							"@type": "Offer",
							price: "98",
							seller: { "@type": "Organization", name: "Allbirds Inc." },
						},
					],
				}),
			],
			meta: {},
			title: "x",
		});
		expect(signals.types).toEqual(["Product"]);
		expect(signals.brand).toBe("Allbirds");
		expect(signals.seller).toBe("Allbirds Inc.");
	});

	test("accepts a plain-string brand", () => {
		const signals = signalsFromPage({
			jsonLd: [JSON.stringify({ "@type": "Product", brand: "Acme" })],
			meta: {},
			title: "x",
		});
		expect(signals.brand).toBe("Acme");
		expect(signals.seller).toBeUndefined();
	});
});
