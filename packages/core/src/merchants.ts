import type { Category, MerchantGuess } from "./schema";
import type { PageSignals } from "./signals";

// How common US merchants usually code. Issuers decide the real code at charge
// time, so even curated entries are a guess the user can override. Only
// merchants whose category is unambiguous belong here.
export const merchantMap: Record<string, Category> = {
	// Superstores stay online_retail on their own domains.
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
	"wayfair.com": "online_retail",
	"chewy.com": "online_retail",
	"macys.com": "online_retail",
	"nordstrom.com": "online_retail",
	"kohls.com": "online_retail",
	"zappos.com": "online_retail",
	"nike.com": "online_retail",
	"sephora.com": "online_retail",
	"ulta.com": "online_retail",
	"temu.com": "online_retail",
	"shein.com": "online_retail",

	"costco.com": "warehouse_club",
	"samsclub.com": "warehouse_club",
	"bjs.com": "warehouse_club",

	"kroger.com": "grocery",
	"safeway.com": "grocery",
	"wholefoodsmarket.com": "grocery",
	"traderjoes.com": "grocery",
	"instacart.com": "grocery",
	"albertsons.com": "grocery",
	"vons.com": "grocery",
	"ralphs.com": "grocery",
	"publix.com": "grocery",
	"heb.com": "grocery",
	"wegmans.com": "grocery",
	"aldi.us": "grocery",
	"sprouts.com": "grocery",
	"foodlion.com": "grocery",
	"stopandshop.com": "grocery",
	"giantfood.com": "grocery",
	"harristeeter.com": "grocery",
	"shoprite.com": "grocery",
	"hy-vee.com": "grocery",
	"freshdirect.com": "grocery",

	// Delivery apps code as dining with most issuers.
	"doordash.com": "dining",
	"ubereats.com": "dining",
	"grubhub.com": "dining",
	"postmates.com": "dining",
	"seamless.com": "dining",
	"starbucks.com": "dining",
	"dunkindonuts.com": "dining",
	"mcdonalds.com": "dining",
	"chick-fil-a.com": "dining",
	"chipotle.com": "dining",
	"tacobell.com": "dining",
	"wendys.com": "dining",
	"burgerking.com": "dining",
	"kfc.com": "dining",
	"subway.com": "dining",
	"dominos.com": "dining",
	"pizzahut.com": "dining",
	"papajohns.com": "dining",
	"panerabread.com": "dining",
	"sweetgreen.com": "dining",

	"cvs.com": "drugstore",
	"walgreens.com": "drugstore",

	"netflix.com": "streaming",
	"spotify.com": "streaming",
	"hulu.com": "streaming",
	"disneyplus.com": "streaming",
	"hbomax.com": "streaming",
	"max.com": "streaming",
	"peacocktv.com": "streaming",
	"paramountplus.com": "streaming",
	"pandora.com": "streaming",
	"siriusxm.com": "streaming",
	"sling.com": "streaming",
	"fubo.tv": "streaming",
	"crunchyroll.com": "streaming",
	"tidal.com": "streaming",

	"delta.com": "travel",
	"united.com": "travel",
	"aa.com": "travel",
	"southwest.com": "travel",
	"alaskaair.com": "travel",
	"jetblue.com": "travel",
	"flyfrontier.com": "travel",
	"spirit.com": "travel",
	"amtrak.com": "travel",
	"marriott.com": "travel",
	"hilton.com": "travel",
	"hyatt.com": "travel",
	"ihg.com": "travel",
	"wyndhamhotels.com": "travel",
	"choicehotels.com": "travel",
	"airbnb.com": "travel",
	"vrbo.com": "travel",
	"expedia.com": "travel",
	"booking.com": "travel",
	"hotels.com": "travel",
	"hertz.com": "travel",
	"enterprise.com": "travel",
	"avis.com": "travel",

	"shell.us": "gas",
	"exxon.com": "gas",
	"mobil.com": "gas",
	"chevron.com": "gas",
	"texaco.com": "gas",
	"sunoco.com": "gas",
	"speedway.com": "gas",
	"arco.com": "gas",
	"valero.com": "gas",
	"citgo.com": "gas",
	"marathonbrand.com": "gas",
	"phillips66gas.com": "gas",
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

// Cart words describe the checkout flow, not the merchant, so they are skipped
// on third-party checkout hosts.
const cartHint: [Category, RegExp] = [
	"online_retail",
	/\b(add to cart|add to bag|checkout|place order|order summary|shipping address)\b/i,
];

// Keyword hints over the page text, used only when nothing structured matched.
const hints: [Category, RegExp][] = [
	["dining", /\b(restaurant|menu|takeout|delivery|diner|cafe|pizza)\b/i],
	["grocery", /\b(grocery|groceries|supermarket|produce)\b/i],
	["drugstore", /\b(pharmacy|prescriptions?|drugstore)\b/i],
	["travel", /\b(flights?|hotels?|airline|booking|resort)\b/i],
	["gas", /\b(fuel|gas station)\b/i],
	["streaming", /\b(streaming|subscribe to watch)\b/i],
	cartHint,
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

function categoryFromKeywords(
	signals: PageSignals = {},
	candidates = hints,
): Category | undefined {
	const text = [signals.title, signals.description, signals.siteName].join(" ");
	return candidates.find(([, pattern]) => pattern.test(text))?.[0];
}

type Via = NonNullable<MerchantGuess["via"]>;

// Third-party checkout and payment hosts. The page belongs to some other merchant.
function checkoutVia(hostname: string): Via | undefined {
	const host = hostname.toLowerCase().replace(/\.$/, "");
	if (host === "checkout.shopify.com" || host.endsWith(".myshopify.com"))
		return "shopify";
	if (host === "checkout.stripe.com" || host === "buy.stripe.com")
		return "stripe";
	if (host === "pay.google.com") return "google_pay";
	if (host === "paypal.com" || host.endsWith(".paypal.com")) return "paypal";
	if (
		host === "checkout.square.site" ||
		host === "checkout.squareup.com" ||
		host === "square.link"
	)
		return "square";
	return undefined;
}

// Words that name the checkout flow or the payment host rather than the merchant.
const notMerchant =
	/\b(checkout|check out|payment|pay|cart|order|shopify|stripe|paypal|google|square)\b/i;

function merchantLabel(signals: PageSignals = {}): string | undefined {
	const titleParts = (signals.title ?? "").split(
		/\s+[|\-\u2013\u2014\u00b7:]\s+/,
	);
	const candidates = [
		signals.siteName,
		signals.seller,
		signals.brand,
		...titleParts,
	];
	return candidates
		.map((name) => name?.trim())
		.find((name) => name && !notMerchant.test(name));
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

	// Low confidence: we only know the merchant from what its checkout page says.
	const via = checkoutVia(hostname);
	if (via) {
		const label = merchantLabel(signals);
		const inner = categoryFromStructuredData(signals);
		const keyword = categoryFromKeywords(
			signals,
			hints.filter((hint) => hint !== cartHint),
		);
		return {
			domain,
			category: inner ?? keyword ?? "other",
			confidence: "low",
			source: inner ? "structured_data" : "page_heuristic",
			...(label && { label }),
			via,
		};
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
