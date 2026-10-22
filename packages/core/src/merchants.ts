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

// Keyword hints for merchants missing from the map, checked in order.
const hints: [Category, RegExp][] = [
	["dining", /\b(restaurant|menu|takeout|delivery|diner|cafe|pizza)\b/i],
	["grocery", /\b(grocery|groceries|supermarket|produce)\b/i],
	["drugstore", /\b(pharmacy|prescriptions?|drugstore)\b/i],
	["travel", /\b(flights?|hotels?|airline|booking|resort)\b/i],
	["gas", /\b(fuel|gas station)\b/i],
	["streaming", /\b(streaming|subscribe to watch)\b/i],
	["online_retail", /\b(add to cart|add to bag|checkout)\b/i],
];

export function normalizeDomain(hostname: string): string {
	const labels = hostname.toLowerCase().replace(/\.$/, "").split(".");
	return labels.slice(-2).join(".");
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

	const text = `${signals?.title ?? ""} ${signals?.description ?? ""}`;
	const hint = hints.find(([, pattern]) => pattern.test(text));
	return {
		domain,
		category: hint?.[0] ?? "other",
		confidence: "low",
		source: "page_heuristic",
	};
}
