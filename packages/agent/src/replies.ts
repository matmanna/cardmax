import type { CardProduct, MerchantGuess, Recommendation } from "@cardmax/core";

// Sent on the first exchange: before linking and right after it.
export const privacyNotice =
	"Heads up: your texts pass through our messaging provider and your carrier, and both can read them. Never text card numbers or amounts.";

export const disclaimer = "Rewards math, not financial advice.";

export function notLinkedReply(webUrl: string): string {
	return `Hi, this is Pointmaxx. To link this number, open ${webUrl}/texts, get a 6-digit code, and text it here. ${privacyNotice}`;
}

export const badCodeReply =
	"That code is wrong or expired. Get a new one on the Pointmaxx website and text it here.";

export const tooManyTriesReply =
	"Too many tries. Wait 10 minutes, then text a new code.";

export function linkedReply(): string {
	return `Linked. Text a store name, like "Costco" or "which card for Whole Foods", and I'll compare the cards in your synced wallet. Text UNLINK to disconnect. ${privacyNotice}`;
}

export const unlinkedReply =
	"Unlinked. This number is no longer connected to Pointmaxx.";

export const unknownMerchantReply =
	'I don\'t know that store yet. Text its website instead, like "costco.com".';

export const photoUnclearReply =
	"I couldn't tell which store that is from the photo. Text its name instead.";

// "Looks like Target (medium confidence)." Asks for a correction unless confident.
export function photoPrefix(seen: { name: string | null; confidence: string }) {
	const prefix = `Looks like ${seen.name} (${seen.confidence} confidence).`;
	return seen.confidence === "high"
		? prefix
		: `${prefix} Wrong store? Reply with its name.`;
}

// Appended to answers that came from the whole catalog, not the user's own cards.
export function addCardsHint(webUrl: string): string {
	return `To compare only the cards you carry, add them at ${webUrl}/dashboard.`;
}

const categoryLabel: Record<MerchantGuess["category"], string> = {
	dining: "dining",
	grocery: "grocery",
	gas: "gas",
	travel: "travel",
	streaming: "streaming",
	drugstore: "drugstore",
	online_retail: "online retail",
	warehouse_club: "warehouse club",
	other: "general spend",
};

function cardLabel(card: CardProduct | undefined, fallback: string): string {
	return card ? `${card.issuer} ${card.name}` : fallback;
}

// Phrased as what each card earns, never as a recommendation to do anything.
export function recommendationReply(
	merchant: MerchantGuess,
	ranked: Recommendation[],
	catalog: CardProduct[],
): string {
	const byId = new Map(catalog.map((card) => [card.id, card]));
	const [best, next] = ranked;
	if (!best) return unknownMerchantReply;

	const where = `${merchant.domain} (likely codes as ${categoryLabel[merchant.category]}, ${merchant.confidence} confidence)`;
	const lines = [
		`At ${where}:`,
		`Top earner: ${cardLabel(byId.get(best.cardId), best.cardId)}, ${best.reason}, about $${best.estimatedRewardUsd.toFixed(2)} per $100.`,
	];
	if (next && next.estimatedRewardUsd < best.estimatedRewardUsd) {
		lines.push(
			`Next: ${cardLabel(byId.get(next.cardId), next.cardId)}, ${next.reason}.`,
		);
	} else if (next) {
		lines.push(
			`Tied: ${cardLabel(byId.get(next.cardId), next.cardId)}, ${next.reason}.`,
		);
	}
	if (merchant.confidence !== "high") {
		lines.push("The store's category is a guess, so check your card's terms.");
	}
	lines.push(disclaimer);
	return lines.join("\n");
}
