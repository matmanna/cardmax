import { merchantMap } from "@cardmax/core";

// Words people put around a store name: "which card for Whole Foods?", "at costco".
const filler =
	/\b(which|what|best|card|cards|should|i|use|for|at|in|on|the|to|is|a|shopping|buy|buying)\b/g;

const curatedDomains = Object.keys(merchantMap);

// "Whole Foods" -> "wholefoods", "chick-fil-a.com" -> "chickfilacom".
function compact(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Turns a texted store name or website into a hostname for guessMerchant(), or null.
export function merchantFromText(text: string): string | null {
	const lower = text.toLowerCase().trim();

	const site = lower.match(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})\b/);
	if (site?.[1]) return site[1];

	const name = compact(lower.replace(filler, " "));
	if (name.length < 2) return null;

	const exact = curatedDomains.find(
		(domain) => compact(domain.split(".")[0] ?? "") === name,
	);
	if (exact) return exact;
	// Prefixes need a few letters, or "co" would match costco.com.
	if (name.length < 4) return null;
	return (
		curatedDomains.find((domain) => compact(domain).startsWith(name)) ?? null
	);
}
