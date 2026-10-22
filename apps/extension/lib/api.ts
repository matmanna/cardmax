import { type Listing, type ListingQuery, listing } from "@cardmax/core";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { z } from "zod";

const apiUrl = import.meta.env.WXT_API_URL as string | undefined;

type ListingsClient = {
	listings: { search(input: ListingQuery): Promise<unknown> };
};

// Shown when no API is configured, so the consent flow can be demoed offline.
const sample: Listing[] = [
	{
		merchant: "bestbuy",
		domain: "www.bestbuy.com",
		title: "Sample listing (no API configured)",
		priceUsd: 299.99,
		url: "https://www.bestbuy.com/",
	},
	{
		merchant: "walmart",
		domain: "www.walmart.com",
		title: "Sample listing (no API configured)",
		priceUsd: 309.99,
		url: "https://www.walmart.com/",
	},
];

export const listingsEndpoint = apiUrl
	? `${apiUrl}/api/rpc/listings/search`
	: "nowhere (sample data, nothing is sent)";

export async function searchListings(query: ListingQuery): Promise<Listing[]> {
	if (!apiUrl) return sample;
	const client = createORPCClient<ListingsClient>(
		new RPCLink({ url: `${apiUrl}/api/rpc` }),
	);
	return z.array(listing).parse(await client.listings.search(query));
}
