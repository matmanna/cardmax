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

// Revoke: stop every send and delete everything Cardmax stored on this device.
export async function revokeAll(): Promise<void> {
	await browser.storage.local.clear();
	await browser.storage.local.set({
		settings: { ...defaults, sendsEnabled: false },
	});
}
