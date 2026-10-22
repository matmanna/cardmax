import {
	catalog,
	guessMerchant,
	recommend,
	type WalletCard,
} from "@cardmax/core";

import type { Inbound } from "./channel";
import { parseLinkCode } from "./link-code";
import { merchantFromText } from "./merchant-text";
import {
	badCodeReply,
	emptyWalletReply,
	linkedReply,
	notLinkedReply,
	recommendationReply,
	tooManyTriesReply,
	unknownMerchantReply,
	unlinkedReply,
} from "./replies";

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

export type AgentDeps = { store: AgentStore; webUrl: string };

// Recommendations assume $100 so replies read "about $2.00 per $100". We never ask for amounts.
const perHundred = 100;

// One inbound text in, one reply out. Nothing about the message is kept.
export async function handleInbound(
	inbound: Inbound,
	{ store, webUrl }: AgentDeps,
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

	if (!userId) return notLinkedReply(webUrl);

	if (/^\s*unlink\s*$/i.test(text)) {
		await store.unlinkPhone(inbound.from);
		return unlinkedReply;
	}

	const hostname = merchantFromText(text);
	if (!hostname) return unknownMerchantReply;

	const wallet = await store.walletFor(userId);
	if (!wallet.length) return emptyWalletReply(webUrl);

	const merchant = guessMerchant(hostname);
	const ranked = recommend(wallet, catalog, merchant, perHundred);
	return recommendationReply(merchant, ranked, catalog);
}
