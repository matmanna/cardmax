import type { PageRaw, PageSignals } from "@cardmax/core";

export type ActiveTab = {
	tabId: number;
	url: string;
	hostname: string;
	raw: PageRaw;
};

// Serialized and run in the page, so it must not reference anything outside itself.
function collect(): PageRaw {
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
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
	return tab;
}

export async function readActiveTab(): Promise<ActiveTab | null> {
	const tab = await targetTab();
	if (tab?.id === undefined || !tab.url) return null;
	const url = new URL(tab.url);
	if (url.protocol !== "http:" && url.protocol !== "https:") return null;
	try {
		const [result] = await browser.scripting.executeScript({
			target: { tabId: tab.id },
			func: collect,
		});
		if (!result?.result) return null;
		return {
			tabId: tab.id,
			url: tab.url,
			hostname: url.hostname,
			raw: result.result,
		};
	} catch {
		return null;
	}
}

export function pageSignals(raw: PageRaw): PageSignals {
	return { title: raw.title || undefined, description: raw.meta.description };
}
