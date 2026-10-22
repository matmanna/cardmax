import type { WalletCard } from "@cardmax/core";

import { getAccountWallet, putAccountWallet, unlinkDevice } from "./api";
import { getLink, getWallet, setLink, setWallet } from "./storage";

// Runs in the background only, so this flag sees every wallet write there.
let applyingRemote = false;

export function isApplyingRemote(): boolean {
	return applyingRemote;
}

async function applyRemote(cards: WalletCard[]): Promise<void> {
	applyingRemote = true;
	try {
		await setWallet(cards);
	} finally {
		applyingRemote = false;
	}
}

// When linked, the account wallet is the source of truth on open.
export async function pullFromAccount(): Promise<void> {
	const link = await getLink();
	if (!link) return;
	const remote = await getAccountWallet(link.token);
	if (remote) await applyRemote(remote.cards);
	else await putAccountWallet(link.token, await getWallet());
}

export async function pushToAccount(cards: WalletCard[]): Promise<void> {
	const link = await getLink();
	if (link) await putAccountWallet(link.token, cards);
}

// First connect keeps cards from both sides, so nothing is lost.
export async function connect(token: string, email: string): Promise<void> {
	await setLink({ token, email });
	const remote = await getAccountWallet(token);
	const local = await getWallet();
	const merged = [...local];
	for (const card of remote?.cards ?? []) {
		if (!merged.some((c) => c.cardId === card.cardId)) merged.push(card);
	}
	await applyRemote(merged);
	await putAccountWallet(token, merged);
}

export async function disconnect(): Promise<void> {
	const link = await getLink();
	if (!link) return;
	await unlinkDevice(link.token).catch(() => {});
	await setLink(null);
}
