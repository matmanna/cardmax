import {
	type Category,
	category,
	type WalletCard,
	walletCard,
} from "@cardmax/core";
import { z } from "zod";

// Everything Cardmax keeps lives in chrome.storage.local on this device.
const settings = z.object({
	sendsEnabled: z.boolean(),
	centsPerPoint: z.number().positive(),
	overrides: z.record(z.string(), category),
});
export type Settings = z.infer<typeof settings>;

const defaults: Settings = {
	sendsEnabled: true,
	centsPerPoint: 1,
	overrides: {},
};

export async function getWallet(): Promise<WalletCard[]> {
	const { wallet } = await browser.storage.local.get("wallet");
	const parsed = z.array(walletCard).safeParse(wallet);
	return parsed.success ? parsed.data : [];
}

export async function setWallet(wallet: WalletCard[]): Promise<void> {
	await browser.storage.local.set({
		wallet: z.array(walletCard).parse(wallet),
	});
}

// Wallet edits run one at a time, so quick clicks never overwrite each other.
let walletQueue: Promise<unknown> = Promise.resolve();

export function updateWallet(
	change: (wallet: WalletCard[]) => WalletCard[],
): Promise<void> {
	const run = walletQueue.then(async () =>
		setWallet(change(await getWallet())),
	);
	walletQueue = run.catch(() => {});
	return run;
}

export async function getSettings(): Promise<Settings> {
	const { settings: stored } = await browser.storage.local.get("settings");
	const parsed = settings.safeParse(stored);
	return parsed.success ? parsed.data : defaults;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
	const next = settings.parse({ ...(await getSettings()), ...patch });
	await browser.storage.local.set({ settings: next });
}

export async function setOverride(
	domain: string,
	value: Category,
): Promise<void> {
	const { overrides } = await getSettings();
	await updateSettings({ overrides: { ...overrides, [domain]: value } });
}

// The account link the web app handed over. The token only reaches wallet calls.
const link = z.object({ token: z.string(), email: z.string() });
export type Link = z.infer<typeof link>;

export async function getLink(): Promise<Link | null> {
	const { link: stored } = await browser.storage.local.get("link");
	const parsed = link.safeParse(stored);
	return parsed.success ? parsed.data : null;
}

export async function setLink(value: Link | null): Promise<void> {
	if (value) await browser.storage.local.set({ link: link.parse(value) });
	else await browser.storage.local.remove("link");
}

// Revoke: stop every send and delete everything Cardmax stored on this device.
export async function revokeAll(): Promise<void> {
	await browser.storage.local.clear();
	await browser.storage.local.set({
		settings: { ...defaults, sendsEnabled: false },
	});
}
