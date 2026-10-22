import type {
	CardProduct,
	MerchantGuess,
	Recommendation,
	WalletCard,
} from "./schema";

// Ranks the user's cards for one purchase. Runs on device, makes no network calls.
export function recommend(
	wallet: WalletCard[],
	catalog: CardProduct[],
	merchant: MerchantGuess,
	amountUsd: number,
	centsPerPoint = 1,
): Recommendation[] {
	const held = new Set(wallet.map((card) => card.cardId));

	return catalog
		.filter((product) => held.has(product.id))
		.map((product) => {
			const rule = product.rules.find(
				(r) =>
					r.category === merchant.category &&
					!r.excludesMerchants.includes(merchant.domain),
			);
			const multiplier = rule?.multiplier ?? product.baseMultiplier;
			return {
				cardId: product.id,
				multiplier,
				estimatedRewardUsd: (amountUsd * multiplier * centsPerPoint) / 100,
				reason: rule
					? `${multiplier}x on ${merchant.category}`
					: `${multiplier}x base rate`,
			};
		})
		.sort((a, b) => b.estimatedRewardUsd - a.estimatedRewardUsd);
}
