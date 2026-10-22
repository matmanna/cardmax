import {
	catalog as bundledCards,
	merchantMap as bundledMerchants,
	type CardProduct,
	type Category,
	catalogResponse,
} from "@cardmax/core";
import { z } from "zod";

import { apiConfigured, fetchCatalog } from "./api";

export type Catalog = {
	cards: CardProduct[];
	merchants: Record<string, Category>;
	source: "server" | "bundled";
};

const cached = z.object({ data: catalogResponse, fetchedAt: z.number() });
const staleAfterMs = 24 * 60 * 60 * 1000;

const bundled: Catalog = {
	cards: bundledCards,
	merchants: bundledMerchants,
	source: "bundled",
};

// The pulled catalog when there is one, else the copy shipped in the build.
export async function getCatalog(): Promise<Catalog> {
	const { catalog: stored } = await browser.storage.local.get("catalog");
	const parsed = cached.safeParse(stored);
	if (!parsed.success || parsed.data.data.cards.length === 0) return bundled;
	const { cards, merchants } = parsed.data.data;
	return {
		cards,
		merchants: Object.fromEntries(merchants.map((m) => [m.domain, m.category])),
		source: "server",
	};
}

// Pulls the public catalog at most once a day. Failures keep the last copy.
export async function refreshCatalog(force = false): Promise<void> {
	if (!apiConfigured) return;
	const { catalog: stored } = await browser.storage.local.get("catalog");
	const parsed = cached.safeParse(stored);
	if (
		!force &&
		parsed.success &&
		Date.now() - parsed.data.fetchedAt < staleAfterMs
	) {
		return;
	}
	const data = await fetchCatalog();
	await browser.storage.local.set({ catalog: { data, fetchedAt: Date.now() } });
}
