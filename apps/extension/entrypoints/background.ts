import {
	extensionMessage,
	guessMerchant,
	type PageRaw,
	parseProduct,
	recommend,
	type WalletCard,
} from "@cardmax/core";

import { getCatalog, refreshCatalog } from "@/lib/catalog";
import { webOrigin } from "@/lib/origins";
import { collect, pageSignals } from "@/lib/page";
import {
	getSettings,
	getWallet,
	seedStarterWallet,
	setWallet,
} from "@/lib/storage";
import {
	connect,
	disconnect,
	isApplyingRemote,
	pullFromAccount,
	pushToAccount,
} from "@/lib/sync";

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
		case "cardmax:connect": {
			const { sendsEnabled } = await getSettings();
			if (!sendsEnabled) return { error: "Sync is turned off on this device" };
			await connect(parsed.data.token, parsed.data.email);
			log("connected");
			return { ok: true };
		}
		case "cardmax:disconnect":
			await disconnect();
			return { ok: true };
	}
}

/* Automatic suggestions on sites the user turned on ----------------------- */

// Local only: shows in the service worker console under chrome://extensions.
function log(...parts: unknown[]) {
	console.info("[pointmaxx]", ...parts);
}

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
	if (tab.id === undefined) return;
	if (!tab.url) {
		log("tab updated, but the browser hid its URL (site not granted)");
		return;
	}
	if (!tab.url.startsWith("https:")) return;
	const stage = checkoutStage(tab.url);
	log("url", tab.url, "stage", stage);
	if (!stage) {
		await browser.action.setBadgeText({ tabId: tab.id, text: "" });
		return;
	}
	const origin = new URL(tab.url).origin;
	if (!(await browser.permissions.contains({ origins: [`${origin}/*`] }))) {
		log("no site access for", origin, "(turn the switch on in the popup)");
		return;
	}
	const [result] = await browser.scripting.executeScript({
		target: { tabId: tab.id },
		func: collect,
	});
	if (!result?.result) {
		log("could not read the page");
		return;
	}
	// The popup reads this when it opens by itself, since an auto-opened popup
	// gets no activeTab grant to read the page on its own.
	await browser.storage.session.set({
		[`context:${tab.id}`]: { url: tab.url, raw: result.result },
	});
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
	const [wallet, settings, catalog] = await Promise.all([
		getWallet(),
		getSettings(),
		getCatalog(),
	]);
	if (wallet.length === 0) {
		// Nothing to suggest yet, so open the popup on its Wallet tab instead.
		log("wallet is empty, opening the popup to add cards");
		await browser.action.setBadgeText({ tabId, text: "+" });
		await browser.action.setTitle({
			tabId,
			title: "Add your cards to Pointmaxx",
		});
		await openOncePerStage(tabId, windowId, stage);
		return;
	}
	const merchant = guessMerchant(
		new URL(url).hostname,
		pageSignals(raw),
		settings.overrides,
		catalog.merchants,
	);
	const amount = parseProduct(raw)?.priceUsd ?? 100;
	const [best] = recommend(
		wallet,
		catalog.cards,
		merchant,
		amount,
		settings.centsPerPoint,
	);
	const card = best && catalog.cards.find((c) => c.id === best.cardId);
	if (!best || !card) {
		log("no card in the catalog matches the wallet");
		await browser.action.setBadgeText({ tabId, text: "" });
		return;
	}
	log("suggest", card.name, best.reason, "for", merchant);

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
	if (seen[key]) {
		log("popup already opened at", stage, "in this tab");
		return;
	}
	await browser.storage.session.set({ [key]: true });
	try {
		await browser.action.openPopup({ windowId });
		log("opened popup at", stage);
	} catch (error) {
		// Not focused, or the browser doesn't allow it. The badge is enough.
		log("openPopup failed:", String(error));
	}
}

export default defineBackground(() => {
	log("background started", browser.runtime.getManifest().version);
	browser.permissions
		.getAll()
		.then(({ origins }) => log("granted sites", origins ?? []));

	// Chrome hides checkout pages until the user grants sites, so ask on install.
	browser.runtime.onInstalled.addListener(({ reason }) => {
		if (reason !== "install") return;
		browser.tabs.create({ url: browser.runtime.getURL("/welcome.html") });
	});

	browser.runtime.onMessageExternal.addListener(
		(message, sender, sendResponse) => {
			handle(message, sender)
				.then(sendResponse)
				.catch(() => sendResponse({ error: "Internal error" }));
			// Keep the channel open for the async reply.
			return true;
		},
	);

	// Account sync and the public catalog, on start and whenever the popup asks.
	const refresh = () =>
		Promise.allSettled([refreshCatalog(), pullFromAccount()]).then(
			(results) => {
				for (const result of results) {
					if (result.status === "rejected")
						log("sync failed:", String(result.reason));
				}
			},
		);
	seedStarterWallet()
		.then((seeded) => seeded && log("seeded starter cards"))
		.catch((error) => log("seed failed:", String(error)))
		.then(refresh);

	// The popup and nothing else may ask for a pull.
	browser.runtime.onMessage.addListener((message, sender) => {
		if (sender.id !== browser.runtime.id) return;
		if ((message as { type?: string })?.type !== "cardmax:pull") return;
		return refresh();
	});

	// Local wallet edits go up to the account when linked.
	browser.storage.onChanged.addListener((changes, area) => {
		if (area !== "local" || !changes.wallet || isApplyingRemote()) return;
		getWallet()
			.then(pushToAccount)
			.catch((error) => log("push failed:", String(error)));
	});

	// A URL change (load or pushState) or a finished load on a granted site.
	browser.tabs.onUpdated.addListener((_tabId, info, tab) => {
		if (!info.url && info.status !== "complete") return;
		onTabUrl(tab).catch((error) => log("error", String(error)));
	});

	browser.tabs.onRemoved.addListener((tabId) => {
		browser.storage.session
			.remove([
				`opened:${tabId}:cart`,
				`opened:${tabId}:checkout`,
				`context:${tabId}`,
			])
			.catch(() => {});
	});
});
