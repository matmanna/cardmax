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
export const earnRule = z.object({
	category,
	multiplier: z.number().nonnegative(),
	capUsd: z.number().positive().optional(),
	excludesMerchants: z.array(z.string()).default([]),
});

export const cardProduct = z.object({
	id: z.string(),
	issuer: z.string(),
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
