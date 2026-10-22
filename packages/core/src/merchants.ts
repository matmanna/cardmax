import type { Category, MerchantGuess } from "./schema";
import type { PageSignals } from "./signals";

// How common US merchants usually code. Issuers decide the real code at charge
// time, so even curated entries are a guess the user can override.
export const merchantMap: Record<string, Category> = {
	"amazon.com": "online_retail",
	"bestbuy.com": "online_retail",
	"ebay.com": "online_retail",
	"etsy.com": "online_retail",
	"newegg.com": "online_retail",
	"apple.com": "online_retail",
	"target.com": "online_retail",
	"walmart.com": "online_retail",
	"homedepot.com": "online_retail",
	"lowes.com": "online_retail",
	"costco.com": "warehouse_club",
	"samsclub.com": "warehouse_club",
	"bjs.com": "warehouse_club",
	"kroger.com": "grocery",
	"safeway.com": "grocery",
	"wholefoodsmarket.com": "grocery",
	"traderjoes.com": "grocery",
	"instacart.com": "grocery",
	"doordash.com": "dining",
	"ubereats.com": "dining",
	"grubhub.com": "dining",
	"starbucks.com": "dining",
	"cvs.com": "drugstore",
	"walgreens.com": "drugstore",
	"netflix.com": "streaming",
	"spotify.com": "streaming",
	"hulu.com": "streaming",
	"delta.com": "travel",
	"united.com": "travel",
	"marriott.com": "travel",
	"airbnb.com": "travel",
	"shell.us": "gas",
};

// schema.org types that say what kind of business the page is.
const businessTypes: Record<string, Category> = {
	Restaurant: "dining",
	FoodEstablishment: "dining",
	CafeOrCoffeeShop: "dining",
	FastFoodRestaurant: "dining",
	BarOrPub: "dining",
	Bakery: "dining",
	IceCreamShop: "dining",
	GroceryStore: "grocery",
	GasStation: "gas",
	Pharmacy: "drugstore",
	Drugstore: "drugstore",
	LodgingBusiness: "travel",
	Hotel: "travel",
	Motel: "travel",
	Resort: "travel",
	Airline: "travel",
	FlightReservation: "travel",
	LodgingReservation: "travel",
};

// Weaker than a business type: any shop can sell a product.
const productTypes = new Set([
	"Product",
	"ProductGroup",
	"Offer",
	"AggregateOffer",
]);

// Keyword hints over the page text, used only when nothing structured matched.
const hints: [Category, RegExp][] = [
	["dining", /\b(restaurant|menu|takeout|delivery|diner|cafe|pizza)\b/i],
	["grocery", /\b(grocery|groceries|supermarket|produce)\b/i],
	["drugstore", /\b(pharmacy|prescriptions?|drugstore)\b/i],
	["travel", /\b(flights?|hotels?|airline|booking|resort)\b/i],
	["gas", /\b(fuel|gas station)\b/i],
	["streaming", /\b(streaming|subscribe to watch)\b/i],
	[
		"online_retail",
		/\b(add to cart|add to bag|checkout|place order|order summary|shipping address)\b/i,
	],
];

function categoryFromStructuredData(
	signals: PageSignals = {},
): Category | undefined {
	const types = signals.types ?? [];
	for (const type of types) {
		const category = businessTypes[type];
		if (category) return category;
	}
	if (signals.ogType?.startsWith("restaurant")) return "dining";
	if (types.some((t) => productTypes.has(t))) return "online_retail";
	if (signals.ogType?.startsWith("product")) return "online_retail";
	return undefined;
}

function categoryFromKeywords(signals: PageSignals = {}): Category | undefined {
	const text = [signals.title, signals.description, signals.siteName].join(" ");
	return hints.find(([, pattern]) => pattern.test(text))?.[0];
}

// Common multi-part public suffixes. Not the full Public Suffix List, just
// enough that amazon.co.uk stays amazon.co.uk. myshopify.com is here so each
// Shopify store keeps its own domain for overrides.
const multiPartSuffixes = new Set([
	"co.uk",
	"org.uk",
	"me.uk",
	"ac.uk",
	"gov.uk",
	"com.au",
	"net.au",
	"org.au",
	"co.nz",
	"co.jp",
	"ne.jp",
	"or.jp",
	"co.kr",
	"co.in",
	"co.za",
	"co.il",
	"com.br",
	"com.mx",
	"com.ar",
	"com.sg",
	"com.hk",
	"com.tw",
	"com.cn",
	"com.tr",
	"myshopify.com",
]);

// The registrable domain, so www., m., shop., checkout. and the like drop away.
export function normalizeDomain(hostname: string): string {
	const labels = hostname.toLowerCase().replace(/\.$/, "").split(".");
	const suffix = labels.slice(-2).join(".");
	const size = multiPartSuffixes.has(suffix) ? 3 : 2;
	return labels.slice(-size).join(".");
}

export function guessMerchant(
	hostname: string,
	signals?: PageSignals,
	overrides: Record<string, Category> = {},
): MerchantGuess {
	const domain = normalizeDomain(hostname);

	const override = overrides[domain];
	if (override) {
		return {
			domain,
			category: override,
			confidence: "high",
			source: "user_override",
		};
	}

	const curated = merchantMap[domain];
	if (curated) {
		return { domain, category: curated, confidence: "high", source: "curated" };
	}

	const structured = categoryFromStructuredData(signals);
	if (structured) {
		return {
			domain,
			category: structured,
			confidence: "medium",
			source: "structured_data",
		};
	}

	return {
		domain,
		category: categoryFromKeywords(signals) ?? "other",
		confidence: "low",
		source: "page_heuristic",
	};
}
