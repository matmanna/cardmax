import {
	catalog,
	extensionMessage,
	guessMerchant,
	parseProduct,
	recommend,
	type WalletCard,
} from "@cardmax/core";
import { z } from "zod";

import { pageSignals } from "@/lib/page";
import { getSettings, getWallet, setWallet } from "@/lib/storage";

// Same fallback as externally_connectable in wxt.config.ts.
const webOrigin =
	(import.meta.env.WXT_WEB_ORIGIN as string | undefined) ??
	"http://localhost:3001";

type Reply = { wallet: WalletCard[] } | { ok: true } | { error: string };

async function handle(
	message: unknown,
	sender: Browser.runtime.MessageSender,
): Promise<Reply> {
	if (sender.origin !== webOrigin) {
		return { error: "Sender not allowed" };
	}
	const parsed = extensionMessage.safeParse(message);
	if (!parsed.success) return { error: "Invalid message" };
	switch (parsed.data.type) {
		case "cardmax:getWallet":
			return { wallet: await getWallet() };
		case "cardmax:setWallet": {
			// Revoked users stay revoked until they re-enable sends in the popup.
			const { sendsEnabled } = await getSettings();
			if (!sendsEnabled) return { error: "Sync is turned off on this device" };
			await setWallet(parsed.data.wallet);
			return { ok: true };
		}
	}
}

/* Automatic suggestions on sites the user turned on ----------------------- */

const checkoutScriptId = "cardmax-checkout";

// The checkout script runs only on origins the user granted from the popup.
async function syncCheckoutScript(): Promise<void> {
	const { origins = [] } = await browser.permissions.getAll();
	const matches = origins.filter((origin) => origin !== "https://*/*");
	const registered = await browser.scripting.getRegisteredContentScripts({
		ids: [checkoutScriptId],
	});
	if (registered.length) {
		await browser.scripting.unregisterContentScripts({
			ids: [checkoutScriptId],
		});
	}
	if (!matches.length) return;
	await browser.scripting.registerContentScripts([
		{
			id: checkoutScriptId,
			matches,
			js: ["content-scripts/checkout.js"],
			runAt: "document_idle",
		},
	]);
}

const checkoutMessage = z.object({
	type: z.literal("cardmax:checkout"),
	raw: z.object({
		jsonLd: z.array(z.string()),
		meta: z.record(z.string(), z.string()),
		title: z.string(),
	}),
});

// Shows the best card as a toolbar badge. Nothing leaves the device.
async function suggest(
	message: unknown,
	sender: Browser.runtime.MessageSender,
): Promise<void> {
	const parsed = checkoutMessage.safeParse(message);
	const tabId = sender.tab?.id;
	if (!parsed.success || tabId === undefined || !sender.url) return;

	const { raw } = parsed.data;
	const [wallet, settings] = await Promise.all([getWallet(), getSettings()]);
	const merchant = guessMerchant(
		new URL(sender.url).hostname,
		pageSignals(raw),
		settings.overrides,
	);
	const amount = parseProduct(raw)?.priceUsd ?? 100;
	const [best] = recommend(
		wallet,
		catalog,
		merchant,
		amount,
		settings.centsPerPoint,
	);
	const card = best && catalog.find((c) => c.id === best.cardId);
	if (!best || !card) {
		await browser.action.setBadgeText({ tabId, text: "" });
		return;
	}

	const unit = card.rewardCurrency === "cash" ? "%" : "x";
	await browser.action.setBadgeBackgroundColor({ tabId, color: "#0B1B2B" });
	await browser.action.setBadgeText({
		tabId,
		text: `${best.multiplier}${unit}`,
	});
	await browser.action.setTitle({
		tabId,
		title: `Use ${card.issuer} ${card.name} · ${best.reason}`,
	});
	await openOncePerTab(tabId, sender.tab?.windowId);
}

// Opens the popup the first time a tab reaches checkout, so it doesn't nag on
// every step. Chrome refuses when the window isn't focused; the badge stays.
async function openOncePerTab(tabId: number, windowId?: number) {
	const key = `opened:${tabId}`;
	const seen = await browser.storage.session.get(key);
	if (seen[key]) return;
	await browser.storage.session.set({ [key]: true });
	try {
		await browser.action.openPopup(windowId ? { windowId } : undefined);
	} catch {
		// Not focused, or the browser doesn't allow it. The badge is enough.
	}
}

export default defineBackground(() => {
	browser.runtime.onMessageExternal.addListener(
		(message, sender, sendResponse) => {
			handle(message, sender)
				.then(sendResponse)
				.catch(() => sendResponse({ error: "Internal error" }));
			// Keep the channel open for the async reply.
			return true;
		},
	);

	// Only the extension's own content script may send this.
	browser.runtime.onMessage.addListener((message, sender) => {
		if (sender.id !== browser.runtime.id) return;
		suggest(message, sender).catch(() => {});
	});

	browser.tabs.onRemoved.addListener((tabId) => {
		browser.storage.session.remove(`opened:${tabId}`).catch(() => {});
	});

	browser.runtime.onInstalled.addListener(() => {
		syncCheckoutScript().catch(() => {});
	});
	browser.permissions.onAdded.addListener(() => {
		syncCheckoutScript().catch(() => {});
	});
	browser.permissions.onRemoved.addListener(() => {
		syncCheckoutScript().catch(() => {});
	});
});
