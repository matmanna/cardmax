import { type PageRaw, type PageSignals, signalsFromPage } from "@cardmax/core";
import { z } from "zod";

import { webOrigin } from "./origins";

export type ActiveTab = {
	tabId: number;
	url: string;
	hostname: string;
	raw: PageRaw;
};

// Serialized and run in the page, so it must not reference anything outside itself.
// The checkout content script also calls it directly.
export function collect(): PageRaw {
	const jsonLd = Array.from(
		document.querySelectorAll('script[type="application/ld+json"]'),
		(el) => el.textContent ?? "",
	);
	const meta: Record<string, string> = {};
	for (const el of Array.from(document.querySelectorAll("meta[content]"))) {
		const key = el.getAttribute("property") ?? el.getAttribute("name");
		const content = el.getAttribute("content");
		if (!key || content === null) continue;
		if (
			key === "description" ||
			key.startsWith("og:") ||
			key.startsWith("product:") ||
			key.startsWith("twitter:")
		) {
			meta[key] = content;
		}
	}
	return { jsonLd, meta, title: document.title };
}

// E2E builds only: the tests open the popup in a tab, which makes the popup
// itself the active tab, so they pass the store tab as ?tab=<id> instead.
async function targetTab(): Promise<Browser.tabs.Tab | undefined> {
	if (import.meta.env.WXT_E2E) {
		const id = Number(new URLSearchParams(location.search).get("tab"));
		if (Number.isInteger(id) && id > 0) return browser.tabs.get(id);
	}
	// The popup's own window first, then the last focused one. A tab showing
	// the Pointmaxx web app is never the store, for example in a split view.
	const found = new Map<number, Browser.tabs.Tab>();
	for (const query of [
		{ active: true, currentWindow: true },
		{ active: true, lastFocusedWindow: true },
	]) {
		for (const tab of await browser.tabs.query(query)) {
			if (tab.id !== undefined && !found.has(tab.id)) found.set(tab.id, tab);
		}
	}
	const tabs = [...found.values()];
	return tabs.find((tab) => !isWebApp(tab.url)) ?? tabs[0];
}

function isWebApp(url: string | undefined): boolean {
	if (!url) return false;
	try {
		return new URL(url).origin === webOrigin;
	} catch {
		return false;
	}
}

// What the background read at checkout, for when the popup can't read the page.
const savedContext = z.object({
	url: z.string(),
	raw: z.object({
		jsonLd: z.array(z.string()),
		meta: z.record(z.string(), z.string()),
		title: z.string(),
	}),
});

async function fromBackground(tabId: number): Promise<ActiveTab | null> {
	const key = `context:${tabId}`;
	const parsed = savedContext.safeParse(
		(await browser.storage.session.get(key))[key],
	);
	if (!parsed.success) return null;
	const { url, raw } = parsed.data;
	return { tabId, url, hostname: new URL(url).hostname, raw };
}

export async function readActiveTab(): Promise<ActiveTab | null> {
	const tab = await targetTab();
	if (tab?.id === undefined) return null;
	if (!tab.url) return fromBackground(tab.id);
	if (isWebApp(tab.url)) return null;
	const url = new URL(tab.url);
	if (url.protocol !== "http:" && url.protocol !== "https:") return null;
	try {
		const [result] = await browser.scripting.executeScript({
			target: { tabId: tab.id },
			func: collect,
		});
		if (!result?.result) return fromBackground(tab.id);
		return {
			tabId: tab.id,
			url: tab.url,
			hostname: url.hostname,
			raw: result.result,
		};
	} catch {
		return fromBackground(tab.id);
	}
}

export function pageSignals(raw: PageRaw): PageSignals {
	return signalsFromPage(raw);
}
