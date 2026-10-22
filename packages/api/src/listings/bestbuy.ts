import type { Listing, ListingQuery } from "@cardmax/core";
import z from "zod";

// https://bestbuyapis.github.io/api-documentation/#products-api
const baseUrl = "https://api.bestbuy.com/v1/products";
const show = "sku,name,salePrice,url";

const bestBuyResponse = z.object({
	products: z.array(
		z.object({
			name: z.string(),
			salePrice: z.number().nonnegative(),
			url: z.url(),
		}),
	),
});

type Fetch = (url: string) => Promise<Response>;

// Best Buy stores 12-digit UPC-A. Strip the zero padding of GTIN-13/14.
export function toUpcA(upc: string): string {
	return upc.length > 12 ? upc.replace(/^0+(?=\d{12}$)/, "") : upc;
}

// Search terms go inside the URL path, so keep only letters and digits.
export function titleTerms(title: string): string[] {
	return title
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((word) => word.length > 1)
		.slice(0, 6);
}

export function bestBuyUrls(query: ListingQuery, apiKey: string): string[] {
	const params = `?apiKey=${encodeURIComponent(apiKey)}&format=json&pageSize=5&show=${show}`;
	const urls: string[] = [];
	if (query.upc) urls.push(`${baseUrl}(upc=${toUpcA(query.upc)})${params}`);
	if (query.title) {
		const terms = titleTerms(query.title);
		if (terms.length) {
			const search = terms.map((term) => `search=${term}`).join("&");
			urls.push(`${baseUrl}(${search})${params}`);
		}
	}
	return urls;
}

export function toListings(body: unknown): Listing[] {
	const parsed = bestBuyResponse.safeParse(body);
	if (!parsed.success) return [];
	return parsed.data.products.map((product) => ({
		merchant: "bestbuy",
		domain: "www.bestbuy.com",
		title: product.name,
		priceUsd: product.salePrice,
		url: product.url,
	}));
}

// UPC first; fall back to title only when the UPC finds nothing.
// Errors never include the query, so nothing about it reaches the logs.
export async function searchBestBuy(
	query: ListingQuery,
	apiKey: string,
	fetcher: Fetch = fetch,
): Promise<Listing[]> {
	for (const url of bestBuyUrls(query, apiKey)) {
		const response = await fetcher(url);
		if (!response.ok) throw new Error(`Best Buy returned ${response.status}`);
		const listings = toListings(await response.json());
		if (listings.length) return listings;
	}
	return [];
}
