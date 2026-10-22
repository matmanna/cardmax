import {
	type CatalogResponse,
	cardProduct as cardProductSchema,
	catalog,
	category,
	merchantMap,
} from "@cardmax/core";
import type { Database } from "@cardmax/db";
import { cardProduct, merchant } from "@cardmax/db/schema/catalog";
import { ORPCError } from "@orpc/server";
import z from "zod";

const merchantSchema = z.object({ domain: z.string(), category });

function latest(dates: Date[]): Date | null {
	let max: Date | null = null;
	for (const date of dates) if (!max || date > max) max = date;
	return max;
}

// Core's bundled catalog, used until the database is seeded.
function coreCatalog(): CatalogResponse {
	const checked = catalog.map((card) => new Date(card.checkedOn));
	return {
		cards: catalog,
		merchants: Object.entries(merchantMap).map(([domain, category]) => ({
			domain,
			category,
		})),
		updatedAt: (latest(checked) ?? new Date(0)).toISOString(),
	};
}

// Every row is checked against core's schemas; bad rows are dropped, not sent.
export async function loadCatalog(db: Database): Promise<CatalogResponse> {
	const [cardRows, merchantRows] = await Promise.all([
		db.select().from(cardProduct),
		db.select().from(merchant),
	]);
	if (cardRows.length === 0) return coreCatalog();

	const cards = cardRows.flatMap(({ updatedAt: _, ...row }) => {
		const parsed = cardProductSchema.safeParse(row);
		return parsed.success ? [parsed.data] : [];
	});
	const merchants = merchantRows.flatMap(({ updatedAt: _, ...row }) => {
		const parsed = merchantSchema.safeParse(row);
		return parsed.success ? [parsed.data] : [];
	});
	const dropped =
		cardRows.length - cards.length + merchantRows.length - merchants.length;
	if (dropped > 0) console.warn(`catalog: dropped ${dropped} invalid rows`);

	const updatedAt = latest(
		[...cardRows, ...merchantRows].map((row) => row.updatedAt),
	);
	return {
		cards,
		merchants,
		updatedAt: (updatedAt ?? new Date(0)).toISOString(),
	};
}

// Card ids the wallet may hold: the database catalog once seeded, core's before.
export async function knownCardIds(db: Database): Promise<Set<string>> {
	const rows = await db.select({ id: cardProduct.id }).from(cardProduct);
	const ids = rows.length > 0 ? rows : catalog;
	return new Set(ids.map((card) => card.id));
}

export async function assertKnownCards(
	db: Database,
	cards: { cardId: string }[],
) {
	if (cards.length === 0) return;
	const ids = await knownCardIds(db);
	if (cards.some((card) => !ids.has(card.cardId))) {
		throw new ORPCError("BAD_REQUEST", { message: "Unknown card" });
	}
}
