import { listing, listingQuery } from "@cardmax/core";
import { ORPCError } from "@orpc/server";
import z from "zod";

import { publicProcedure } from "../index";
import { searchBestBuy } from "../listings/bestbuy";
import { enforceRateLimit } from "../rate-limit";

const searchLimit = { name: "listings", limit: 20, windowMs: 60_000 };

export const listingsRouter = {
	// Public so the extension works without an account. The query is never logged or stored.
	search: publicProcedure
		.input(listingQuery)
		.output(z.array(listing))
		.handler(async ({ context, input }) => {
			await enforceRateLimit(context.db, context.clientKey, searchLimit);
			const apiKey = context.listings.bestBuyApiKey;
			if (!apiKey) return [];
			try {
				return await searchBestBuy(input, apiKey);
			} catch {
				throw new ORPCError("BAD_GATEWAY", {
					message: "The retailer search is unavailable right now",
				});
			}
		}),
};
