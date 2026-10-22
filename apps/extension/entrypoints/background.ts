import {
	catalog,
	extensionMessage,
	guessMerchant,
	type PageRaw,
	parseProduct,
	recommend,
	type WalletCard,
} from "@cardmax/core";

import { collect, pageSignals } from "@/lib/page";
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

// Which checkout stage a URL is at, if any. Amazon's checkout lives under /gp/buy/.
function checkoutStage(url: string): "cart" | "checkout" | null {
	const { pathname } = new URL(url);
	if (/(checkout|payment|\/gp\/buy\/)/i.test(pathname)) return "checkout";
	if (/(cart|basket|bag)/i.test(pathname)) return "cart";
	return null;
}

// Watches tab URLs, which includes in-page navigations (Best Buy goes from
// cart to checkout with pushState). Chrome only reports URLs for sites the
// user granted, so nothing else is visible here.
async function onTabUrl(tab: Browser.tabs.Tab): Promise<void> {
	if (tab.id === undefined || !tab.url?.startsWith("https:")) return;
	const stage = checkoutStage(tab.url);
	if (!stage) {
		await browser.action.setBadgeText({ tabId: tab.id, text: "" });
		return;
	}
	const origin = new URL(tab.url).origin;
	if (!(await browser.permissions.contains({ origins: [`${origin}/*`] }))) {
		return;
	}
	const [result] = await browser.scripting.executeScript({
		target: { tabId: tab.id },
		func: collect,
	});
	if (!result?.result) return;
	await suggest(tab.id, tab.windowId, tab.url, stage, result.result);
}

// Shows the best card as a toolbar badge. Nothing leaves the device.
async function suggest(
	tabId: number,
	windowId: number,
	url: string,
	stage: "cart" | "checkout",
	raw: PageRaw,
): Promise<void> {
	const [wallet, settings] = await Promise.all([getWallet(), getSettings()]);
	const merchant = guessMerchant(
		new URL(url).hostname,
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
	await openOncePerStage(tabId, windowId, stage);
}

// Opens the popup once at the cart and once at checkout in each tab, not on
// every step. The browser refuses when the window isn't focused; the badge stays.
async function openOncePerStage(
	tabId: number,
	windowId: number,
	stage: "cart" | "checkout",
) {
	const key = `opened:${tabId}:${stage}`;
	const seen = await browser.storage.session.get(key);
	if (seen[key]) return;
	await browser.storage.session.set({ [key]: true });
	try {
		await browser.action.openPopup({ windowId });
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

	// A URL change (load or pushState) or a finished load on a granted site.
	browser.tabs.onUpdated.addListener((_tabId, info, tab) => {
		if (!info.url && info.status !== "complete") return;
		onTabUrl(tab).catch(() => {});
	});

	browser.tabs.onRemoved.addListener((tabId) => {
		browser.storage.session
			.remove([`opened:${tabId}:cart`, `opened:${tabId}:checkout`])
			.catch(() => {});
	});
});
