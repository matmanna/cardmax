import type { ListingQuery } from "./schema";

// Raw strings collected from the page. Parsing happens here so it can be tested.
export type PageRaw = {
	jsonLd: string[];
	meta: Record<string, string>;
	title: string;
};

export type Product = { title: string; upc?: string; priceUsd?: number };

export type JsonLdNode = Record<string, unknown>;

// Flattens arrays and @graph, the two ways pages bundle several JSON-LD nodes.
export function jsonLdNodes(value: unknown): JsonLdNode[] {
	if (Array.isArray(value)) return value.flatMap(jsonLdNodes);
	if (!value || typeof value !== "object") return [];
	const node = value as JsonLdNode;
	return [node, ...jsonLdNodes(node["@graph"])];
}

function isProduct(node: JsonLdNode): boolean {
	const type = node["@type"];
	return Array.isArray(type) ? type.includes("Product") : type === "Product";
}

function toPrice(value: unknown): number | undefined {
	if (value === undefined || value === null) return undefined;
	const price = Number(String(value).replace(/[^0-9.]/g, ""));
	return Number.isFinite(price) && price > 0 ? price : undefined;
}

function toGtin(node: JsonLdNode): string | undefined {
	for (const key of ["gtin12", "gtin13", "gtin14", "gtin8", "gtin", "upc"]) {
		const digits = String(node[key] ?? "").replace(/\D/g, "");
		if (digits.length >= 8 && digits.length <= 14) return digits;
	}
	return undefined;
}

function offerPrice(offers: unknown): number | undefined {
	for (const offer of jsonLdNodes(offers)) {
		const price = toPrice(offer.price ?? offer.lowPrice);
		if (price) return price;
	}
	return undefined;
}

export function parseProduct(raw: PageRaw): Product | null {
	for (const text of raw.jsonLd) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch {
			continue;
		}
		const product = jsonLdNodes(parsed).find(isProduct);
		if (product && typeof product.name === "string") {
			return {
				title: product.name,
				upc: toGtin(product),
				priceUsd: offerPrice(product.offers),
			};
		}
	}

	const title = raw.meta["og:title"] ?? raw.meta["twitter:title"];
	const price = toPrice(
		raw.meta["product:price:amount"] ?? raw.meta["og:price:amount"],
	);
	if (!title || !price) return null;
	return { title, upc: undefined, priceUsd: price };
}

// The only product data that may leave the device. A UPC alone if we have one.
export function toListingQuery(product: Product): ListingQuery {
	if (product.upc) return { upc: product.upc };
	return { title: product.title.trim().slice(0, 200) };
}
