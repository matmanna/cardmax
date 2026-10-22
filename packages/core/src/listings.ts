import { guessMerchant } from "./merchants";
import { recommend } from "./recommend";
import type {
	CardProduct,
	Category,
	Listing,
	Recommendation,
	WalletCard,
} from "./schema";

export type RankedListing = {
	listing: Listing;
	best?: Recommendation;
	netPriceUsd: number;
};

// Orders listings by price minus the reward from the user's best card there.
export function rankListings(
	listings: Listing[],
	wallet: WalletCard[],
	catalog: CardProduct[],
	centsPerPoint = 1,
	overrides: Record<string, Category> = {},
): RankedListing[] {
	return listings
		.map((listing) => {
			const merchant = guessMerchant(listing.domain, undefined, overrides);
			const [best] = recommend(
				wallet,
				catalog,
				merchant,
				listing.priceUsd,
				centsPerPoint,
			);
			const reward = best?.estimatedRewardUsd ?? 0;
			return {
				listing,
				best,
				netPriceUsd: Math.round((listing.priceUsd - reward) * 100) / 100,
			};
		})
		.sort((a, b) => a.netPriceUsd - b.netPriceUsd);
}
