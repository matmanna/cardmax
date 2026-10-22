import type {
	CardProduct,
	EarnRule,
	MerchantGuess,
	Recommendation,
	WalletCard,
} from "./schema";

function ruleApplies(rule: EarnRule, merchant: MerchantGuess): boolean {
	if (rule.excludesMerchants.includes(merchant.domain)) return false;
	if (rule.onlyMerchants) return rule.onlyMerchants.includes(merchant.domain);
	return rule.category === merchant.category;
}

function describe(
	rule: EarnRule | undefined,
	multiplier: number,
	merchant: MerchantGuess,
): string {
	if (!rule) return `${multiplier}x base rate`;
	const where = rule.onlyMerchants ? merchant.domain : merchant.category;
	const cap = rule.capUsd
		? ` (up to $${rule.capUsd.toLocaleString("en-US")} a year)`
		: "";
	return `${multiplier}x on ${where}${cap}`;
}

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
			const rule = product.rules
				.filter((r) => ruleApplies(r, merchant))
				.sort((a, b) => b.multiplier - a.multiplier)[0];
			const multiplier = Math.max(
				rule?.multiplier ?? 0,
				product.baseMultiplier,
			);
			const bonus = rule && rule.multiplier >= product.baseMultiplier;
			const cents = product.rewardCurrency === "cash" ? 1 : centsPerPoint;
			return {
				cardId: product.id,
				multiplier,
				estimatedRewardUsd: Math.round(amountUsd * multiplier * cents) / 100,
				reason: describe(bonus ? rule : undefined, multiplier, merchant),
			};
		})
		.sort((a, b) => b.estimatedRewardUsd - a.estimatedRewardUsd);
}
