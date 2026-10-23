import {
	type CatalogResponse,
	catalogResponse,
	type DeviceWallet,
	deviceTokenHeader,
	deviceWallet,
	type Listing,
	type ListingQuery,
	listing,
	type WalletCard,
} from "@cardmax/core";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { z } from "zod";

import { apiUrl } from "./origins";

export const apiConfigured = Boolean(apiUrl);

type CloudClient = {
	listings: { search(input: ListingQuery): Promise<unknown> };
	catalog: { list(): Promise<unknown> };
	device: {
		wallet: {
			get(): Promise<unknown>;
			put(input: WalletCard[]): Promise<unknown>;
		};
		unlink(): Promise<unknown>;
	};
};

// The device token goes only on wallet calls, never on listings or catalog.
function client(token?: string) {
	return createORPCClient<CloudClient>(
		new RPCLink({
			url: `${apiUrl}/api/rpc`,
			headers: token ? { [deviceTokenHeader]: token } : {},
		}),
	);
}

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
	return z.array(listing).parse(await client().listings.search(query));
}

// Public card and store data. Nothing personal goes up.
export async function fetchCatalog(): Promise<CatalogResponse> {
	return catalogResponse.parse(await client().catalog.list());
}

export async function getAccountWallet(token: string): Promise<DeviceWallet> {
	return deviceWallet.parse(await client(token).device.wallet.get());
}

export async function putAccountWallet(
	token: string,
	cards: WalletCard[],
): Promise<DeviceWallet> {
	return deviceWallet.parse(await client(token).device.wallet.put(cards));
}

export async function unlinkDevice(token: string): Promise<void> {
	await client(token).device.unlink();
}
