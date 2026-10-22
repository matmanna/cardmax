import { type JsonLdNode, jsonLdNodes, type PageRaw } from "./product";

// What the merchant guess reads from a page. Stays on the device.
export type PageSignals = {
	title?: string;
	description?: string;
	siteName?: string;
	ogType?: string;
	// schema.org @type values from the page's JSON-LD, in page order.
	types?: string[];
	brand?: string;
	seller?: string;
};

function text(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed || undefined;
}

// A brand or seller is either a plain string or a node with a name.
function nameOf(value: unknown): string | undefined {
	for (const node of Array.isArray(value) ? value : [value]) {
		const name = text(node) ?? text((node as JsonLdNode | null)?.name);
		if (name) return name;
	}
	return undefined;
}

function typesOf(node: JsonLdNode): string[] {
	const type = node["@type"];
	return (Array.isArray(type) ? type : [type])
		.map(text)
		.filter((t): t is string => t !== undefined)
		.map((t) => t.replace(/^https?:\/\/schema\.org\//, ""));
}

export function signalsFromPage(raw: PageRaw): PageSignals {
	const nodes = raw.jsonLd.flatMap((source) => {
		try {
			return jsonLdNodes(JSON.parse(source));
		} catch {
			return [];
		}
	});

	const types = [...new Set(nodes.flatMap(typesOf))];
	let brand: string | undefined;
	let seller: string | undefined;
	for (const node of nodes) {
		brand ??= nameOf(node.brand);
		seller ??= nameOf(node.seller);
		for (const offer of jsonLdNodes(node.offers))
			seller ??= nameOf(offer.seller);
	}

	const signals: PageSignals = {
		title: text(raw.title),
		description: text(raw.meta.description) ?? text(raw.meta["og:description"]),
		siteName: text(raw.meta["og:site_name"]),
		ogType: text(raw.meta["og:type"]),
		types,
	};
	if (brand) signals.brand = brand;
	if (seller) signals.seller = seller;
	return signals;
}
