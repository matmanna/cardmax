import { z } from "zod";

// Spend categories that card issuers use for bonus rates.
export const category = z.enum([
	"dining",
	"grocery",
	"gas",
	"travel",
	"streaming",
	"drugstore",
	"online_retail",
	"warehouse_club",
	"other",
]);
export type Category = z.infer<typeof category>;

// A card the user holds. Only issuer and product, never a number or last four.
export const walletCard = z.object({
	cardId: z.string(),
	addedAt: z.string(),
});
export type WalletCard = z.infer<typeof walletCard>;

// One earn rule for one card. Every rule needs a source URL and a check date.
// A rule with onlyMerchants applies to those domains whatever the category.
// capUsd is an annual cap; we never track spend, so it is only shown as a caveat.
export const earnRule = z.object({
	category,
	multiplier: z.number().nonnegative(),
	capUsd: z.number().positive().optional(),
	excludesMerchants: z.array(z.string()).default([]),
	onlyMerchants: z.array(z.string()).optional(),
});
export type EarnRule = z.infer<typeof earnRule>;

export const cardProduct = z.object({
	id: z.string(),
	issuer: z.string(),
	// Cash back is always worth 1 cent per unit; points use the user's valuation.
	rewardCurrency: z.enum(["cash", "points"]),
	name: z.string(),
	annualFeeUsd: z.number().nonnegative(),
	baseMultiplier: z.number().nonnegative(),
	rules: z.array(earnRule),
	sourceUrl: z.url(),
	checkedOn: z.iso.date(),
});
export type CardProduct = z.infer<typeof cardProduct>;

// Our guess at how a merchant codes. Always shown to the user with confidence.
export const merchantGuess = z.object({
	domain: z.string(),
	category,
	confidence: z.enum(["high", "medium", "low"]),
	source: z.enum(["curated", "page_heuristic", "user_override"]),
});
export type MerchantGuess = z.infer<typeof merchantGuess>;

export const recommendation = z.object({
	cardId: z.string(),
	multiplier: z.number(),
	estimatedRewardUsd: z.number(),
	reason: z.string(),
});
export type Recommendation = z.infer<typeof recommendation>;

// The only product data that leaves the device, and only after the user clicks.
// The extension shows this exact object in the payload panel before sending it.
export const listingQuery = z
	.object({
		upc: z
			.string()
			.regex(/^\d{8,14}$/)
			.optional(),
		title: z.string().max(200).optional(),
	})
	.refine((q) => q.upc || q.title, "Send a UPC or a title");
export type ListingQuery = z.infer<typeof listingQuery>;

export const listing = z.object({
	merchant: z.enum(["bestbuy", "walmart"]),
	domain: z.string(),
	title: z.string(),
	priceUsd: z.number().nonnegative(),
	url: z.url(),
});
export type Listing = z.infer<typeof listing>;

// Messages the web app sends to the extension through externally_connectable.
// Only the web app can start this exchange; the extension only replies.
export const extensionMessage = z.discriminatedUnion("type", [
	z.object({ type: z.literal("cardmax:getWallet") }),
	z.object({
		type: z.literal("cardmax:setWallet"),
		wallet: z.array(walletCard),
	}),
]);
export type ExtensionMessage = z.infer<typeof extensionMessage>;
