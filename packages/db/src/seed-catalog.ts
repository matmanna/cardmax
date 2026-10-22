import { catalog, merchantMap } from "@cardmax/core";
import { sql } from "drizzle-orm";

import type { Database } from "./index";
import { cardProduct, merchant } from "./schema/catalog";

// Upserts the verified core catalog. updated_at only moves when a row changes,
// so running this twice leaves the catalog's updatedAt alone.
export async function seedCatalog(db: Database) {
	await db
		.insert(cardProduct)
		.values(catalog.map((card) => ({ ...card })))
		.onConflictDoUpdate({
			target: cardProduct.id,
			set: {
				issuer: sql`excluded.issuer`,
				name: sql`excluded.name`,
				rewardCurrency: sql`excluded.reward_currency`,
				annualFeeUsd: sql`excluded.annual_fee_usd`,
				baseMultiplier: sql`excluded.base_multiplier`,
				rules: sql`excluded.rules`,
				sourceUrl: sql`excluded.source_url`,
				checkedOn: sql`excluded.checked_on`,
				updatedAt: sql`now()`,
			},
			setWhere: sql`(${cardProduct.issuer}, ${cardProduct.name}, ${cardProduct.rewardCurrency}, ${cardProduct.annualFeeUsd}, ${cardProduct.baseMultiplier}, ${cardProduct.rules}, ${cardProduct.sourceUrl}, ${cardProduct.checkedOn}) is distinct from (excluded.issuer, excluded.name, excluded.reward_currency, excluded.annual_fee_usd, excluded.base_multiplier, excluded.rules, excluded.source_url, excluded.checked_on)`,
		});

	await db
		.insert(merchant)
		.values(
			Object.entries(merchantMap).map(([domain, category]) => ({
				domain,
				category,
			})),
		)
		.onConflictDoUpdate({
			target: merchant.domain,
			set: { category: sql`excluded.category`, updatedAt: sql`now()` },
			setWhere: sql`${merchant.category} is distinct from excluded.category`,
		});

	return {
		cards: catalog.length,
		merchants: Object.keys(merchantMap).length,
	};
}
