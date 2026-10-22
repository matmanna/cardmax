import { describe, expect, test } from "bun:test";

import { bestBuyUrls, searchBestBuy, titleTerms, toUpcA } from "./bestbuy";

// Shape of a real /v1/products response with show=sku,name,salePrice,url.
const airpods = {
	from: 1,
	to: 1,
	total: 1,
	products: [
		{
			sku: 6447382,
			name: "Apple - AirPods Pro 2",
			salePrice: 189.99,
			url: "https://api.bestbuy.com/click/-/6447382/pdp",
		},
	],
};
const empty = { from: 0, to: 0, total: 0, products: [] };

function fakeFetch(bodies: unknown[], status = 200) {
	const urls: string[] = [];
	const fetcher = async (url: string) => {
		urls.push(url);
		return new Response(JSON.stringify(bodies.shift() ?? empty), { status });
	};
	return { urls, fetcher };
}

describe("toUpcA", () => {
	test("strips GTIN-13 and GTIN-14 zero padding", () => {
		expect(toUpcA("0190199246850")).toBe("190199246850");
		expect(toUpcA("00190199246850")).toBe("190199246850");
	});

	test("leaves UPC-A and EAN-8 alone", () => {
		expect(toUpcA("190199246850")).toBe("190199246850");
		expect(toUpcA("12345670")).toBe("12345670");
	});
});

describe("titleTerms", () => {
	test("keeps only letters and digits, at most six words", () => {
		expect(
			titleTerms("Apple AirPods Pro (2nd Gen) & MagSafe; Case/USB-C x"),
		).toEqual(["apple", "airpods", "pro", "2nd", "gen", "magsafe"]);
	});

	test("cannot inject Best Buy query syntax", () => {
		const terms = titleTerms("tv)&apiKey=steal(&search=x");
		expect(terms.join(" ")).not.toMatch(/[()&=]/);
	});
});

describe("bestBuyUrls", () => {
	test("UPC query comes before title query", () => {
		const urls = bestBuyUrls({ upc: "190199246850", title: "AirPods" }, "k");
		expect(urls[0]).toContain("products(upc=190199246850)");
		expect(urls[1]).toContain("products(search=airpods)");
	});
});

describe("searchBestBuy", () => {
	test("maps UPC hits to listings and stops there", async () => {
		const { urls, fetcher } = fakeFetch([airpods]);
		const listings = await searchBestBuy(
			{ upc: "190199246850", title: "AirPods" },
			"k",
			fetcher,
		);
		expect(listings).toEqual([
			{
				merchant: "bestbuy",
				domain: "www.bestbuy.com",
				title: "Apple - AirPods Pro 2",
				priceUsd: 189.99,
				url: "https://api.bestbuy.com/click/-/6447382/pdp",
			},
		]);
		expect(urls).toHaveLength(1);
	});

	test("falls back to the title when the UPC finds nothing", async () => {
		const { urls, fetcher } = fakeFetch([empty, airpods]);
		const listings = await searchBestBuy(
			{ upc: "190199246850", title: "AirPods Pro" },
			"k",
			fetcher,
		);
		expect(listings).toHaveLength(1);
		expect(urls[1]).toContain("search=airpods&search=pro");
	});

	test("errors do not include the query or key", async () => {
		const { fetcher } = fakeFetch([], 403);
		const error = await searchBestBuy(
			{ title: "secret thing" },
			"key123",
			fetcher,
		)
			.then(() => null)
			.catch((e: Error) => e.message);
		expect(error).toBe("Best Buy returned 403");
	});

	test("ignores malformed responses", async () => {
		const { fetcher } = fakeFetch([{ products: [{ name: 1 }] }]);
		expect(await searchBestBuy({ title: "tv" }, "k", fetcher)).toEqual([]);
	});
});
