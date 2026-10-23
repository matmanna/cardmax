import {
	catalog,
	guessMerchant,
	recommend,
	suggestCard,
	type WalletCard,
} from "@cardmax/core";

import type { Inbound } from "./channel";
import { parseLinkCode } from "./link-code";
import { merchantFromText } from "./merchant-text";
import {
	addCardsHint,
	badCodeReply,
	linkedReply,
	notLinkedReply,
	photoPrefix,
	photoUnclearReply,
	privacyNotice,
	recommendationReply,
	tooManyTriesReply,
	unknownMerchantReply,
	unlinkedReply,
} from "./replies";
import { stripImageMetadata } from "./strip-metadata";
import type { IdentifyStore, StoreGuess } from "./vision";

// Storage the agent needs. The DB-backed version is in store.ts; tests use a fake.
export type AgentStore = {
	userForPhone(phone: string): Promise<string | null>;
	// Returns the user id the code belonged to and deletes the code, or null.
	consumeLinkCode(code: string): Promise<string | null>;
	linkPhone(userId: string, phone: string): Promise<void>;
	unlinkPhone(phone: string): Promise<void>;
	walletFor(userId: string): Promise<WalletCard[]>;
	// false once a phone has used up its code attempts for the window.
	allowCodeAttempt(phone: string): Promise<boolean>;
};

// Downloads a photo with the provider's auth. Returns raw bytes and the declared type.
export type FetchImage = (
	url: string,
) => Promise<{ bytes: Uint8Array; type: string } | null>;

export type AgentDeps = {
	store: AgentStore;
	webUrl: string;
	// Both are needed for storefront photos; without them a photo gets "text the name".
	fetchImage?: FetchImage;
	identifyStore?: IdentifyStore;
};

// Recommendations assume $100 so replies read "about $2.00 per $100". We never ask for amounts.
const perHundred = 100;

// One inbound text in, one reply out. Nothing about the message is kept.
export async function handleInbound(
	inbound: Inbound,
	{ store, webUrl, fetchImage, identifyStore }: AgentDeps,
): Promise<string> {
	const text = inbound.text?.trim() ?? "";
	const userId = await store.userForPhone(inbound.from);
	const code = parseLinkCode(text);

	if (code) {
		if (!(await store.allowCodeAttempt(inbound.from))) return tooManyTriesReply;
		const owner = await store.consumeLinkCode(code);
		if (!owner) return badCodeReply;
		await store.linkPhone(owner, inbound.from);
		return linkedReply();
	}

	if (!userId) {
		// Store names work without an account: rank the whole catalog. Photos
		// cost a vision call, so they still need a linked number.
		const hostname = merchantFromText(text);
		if (!hostname || inbound.imageUrl) return notLinkedReply(webUrl);
		return `${catalogReply(hostname)}\n${addCardsHint(webUrl)} ${privacyNotice}`;
	}

	if (/^\s*unlink\s*$/i.test(text)) {
		await store.unlinkPhone(inbound.from);
		return unlinkedReply;
	}

	return answerFor(userId, inbound, {
		store,
		webUrl,
		fetchImage,
		identifyStore,
	});
}

// The answer for a known user: a store name or a storefront photo in, the card
// to use out. The web "Try it" panel calls this too, so it matches texting.
export async function answerFor(
	userId: string,
	{ text: rawText, imageUrl }: Pick<Inbound, "text" | "imageUrl">,
	{ store, webUrl, fetchImage, identifyStore }: AgentDeps,
): Promise<string> {
	const text = rawText?.trim() ?? "";
	// A typed store name wins over a photo sent with it.
	let hostname = merchantFromText(text);
	let seen: StoreGuess | null = null;
	if (!hostname && imageUrl) {
		seen = await identifyPhoto(imageUrl, fetchImage, identifyStore);
		if (!seen?.domain || !seen.name) return photoUnclearReply;
		hostname = seen.domain;
	}
	if (!hostname) return unknownMerchantReply;

	// With no saved cards, rank the whole catalog instead of asking for a sync.
	const wallet = await store.walletFor(userId);
	const reply = wallet.length
		? walletReply(hostname, wallet)
		: `${catalogReply(hostname)}\n${addCardsHint(webUrl)}`;
	return seen ? `${photoPrefix(seen)}\n${reply}` : reply;
}

function walletReply(hostname: string, wallet: WalletCard[]): string {
	const merchant = guessMerchant(hostname);
	const ranked = recommend(wallet, catalog, merchant, perHundred);
	const suggestion = suggestCard(wallet, catalog, merchant, perHundred);
	return recommendationReply(merchant, ranked, catalog, suggestion);
}

function catalogReply(hostname: string): string {
	const everyCard = catalog.map((card) => ({
		cardId: card.id,
		addedAt: new Date(0).toISOString(),
	}));
	return walletReply(hostname, everyCard);
}

// Download, strip metadata, then identify. The bytes live only in this call.
async function identifyPhoto(
	url: string,
	fetchImage: FetchImage | undefined,
	identifyStore: IdentifyStore | undefined,
): Promise<StoreGuess | null> {
	if (!fetchImage || !identifyStore) return null;
	const raw = await fetchImage(url).catch(() => null);
	if (!raw) return null;
	const clean = stripImageMetadata(raw.bytes, raw.type);
	if (!clean) return null;
	return identifyStore(clean).catch(() => null);
}
