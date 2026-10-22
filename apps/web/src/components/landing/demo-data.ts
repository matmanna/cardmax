import {
	type CardProduct,
	catalog,
	guessMerchant,
	type Product,
	recommend,
	toListingQuery,
	type WalletCard,
} from "@cardmax/core";

// The demo runs the real engine and catalog on a sample wallet. Nothing here
// is hand-typed math, so the landing page cannot drift from the product.
export const sampleWallet: WalletCard[] = [
	"citi-double-cash",
	"chase-freedom-unlimited",
	"amex-gold",
].map((cardId) => ({ cardId, addedAt: "2026-10-22T00:00:00Z" }));

export type DemoStore = {
	domain: string;
	label: string;
	product: Product & { priceUsd: number };
	// A grocery basket has no single product to look up elsewhere.
	comparable: boolean;
};

export const demoStores: DemoStore[] = [
	{
		domain: "bestbuy.com",
		label: "Best Buy",
		product: {
			title: 'Sony 65" Bravia 7 4K TV',
			upc: "027242925694",
			priceUsd: 1199.99,
		},
		comparable: true,
	},
	{
		domain: "walmart.com",
		label: "Walmart",
		product: { title: "Dyson V15 Detect Vacuum", priceUsd: 649.99 },
		comparable: true,
	},
	{
		domain: "wholefoodsmarket.com",
		label: "Whole Foods",
		product: { title: "Weekly groceries", priceUsd: 86.4 },
		comparable: false,
	},
];

const byId = new Map<string, CardProduct>(catalog.map((c) => [c.id, c]));

export function cardLabel(cardId: string): string {
	const card = byId.get(cardId);
	return card ? `${card.issuer} ${card.name}` : cardId;
}

export function runDemo(store: DemoStore) {
	const merchant = guessMerchant(store.domain);
	const ranked = recommend(
		sampleWallet,
		catalog,
		merchant,
		store.product.priceUsd,
	);
	return {
		merchant,
		ranked,
		query: store.comparable ? toListingQuery(store.product) : null,
	};
}

export function usd(value: number): string {
	return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
