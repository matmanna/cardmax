import { createHmac, timingSafeEqual } from "node:crypto";

import type { Inbound } from "./channel";
import type { FetchImage } from "./handle";
import { maxImageBytes } from "./vision";

export type TwilioParams = Record<string, string>;

// https://www.twilio.com/docs/usage/security: HMAC-SHA1 over the URL plus each
// POST key and value, sorted by key, base64 encoded.
export function verifyTwilioSignature(
	authToken: string,
	url: string,
	params: TwilioParams,
	signature: string | null | undefined,
): boolean {
	if (!signature) return false;
	const data = Object.keys(params)
		.sort()
		.reduce((acc, key) => acc + key + params[key], url);
	const expected = createHmac("sha1", authToken).update(data).digest();
	const given = Buffer.from(signature, "base64");
	return given.length === expected.length && timingSafeEqual(given, expected);
}

// Every MediaUrl{n} in the webhook, in order.
export function twilioMediaUrls(params: TwilioParams): string[] {
	const count = Math.min(Number(params.NumMedia) || 0, 10);
	const urls: string[] = [];
	for (let n = 0; n < count; n++) {
		const url = params[`MediaUrl${n}`];
		if (url) urls.push(url);
	}
	return urls;
}

export function parseTwilioMessage(params: TwilioParams): Inbound | null {
	const from = params.From?.trim();
	if (!from) return null;
	const inbound: Inbound = { from };
	if (params.Body) inbound.text = params.Body;
	for (let n = 0; params[`MediaUrl${n}`] !== undefined; n++) {
		if (params[`MediaContentType${n}`]?.startsWith("image/")) {
			inbound.imageUrl = params[`MediaUrl${n}`];
			break;
		}
	}
	return inbound;
}

// Only this account's media on api.twilio.com, so a forged webhook can't make us fetch anything else.
function twilioMediaUrl(url: string, accountSid: string): URL | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	const ok =
		parsed.protocol === "https:" &&
		parsed.host === "api.twilio.com" &&
		!parsed.username &&
		!parsed.password &&
		parsed.pathname.startsWith(`/2010-04-01/Accounts/${accountSid}/`);
	return ok ? parsed : null;
}

function basicAuth(accountSid: string, authToken: string): string {
	return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

// Twilio redirects media to its CDN; fetch drops the auth header on cross-origin hops.
export function createTwilioImageFetcher(
	accountSid: string,
	authToken: string,
): FetchImage {
	return async (url) => {
		const target = twilioMediaUrl(url, accountSid);
		if (!target) return null;
		const res = await fetch(target, {
			headers: { authorization: basicAuth(accountSid, authToken) },
			redirect: "follow",
		});
		if (!res.ok || !res.body) return null;
		const length = Number(res.headers.get("content-length"));
		if (length > maxImageBytes) {
			await res.body.cancel();
			return null;
		}
		const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
		const chunks: Uint8Array[] = [];
		let size = 0;
		const reader = res.body.getReader();
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.length;
			if (size > maxImageBytes) {
				await reader.cancel();
				return null;
			}
			chunks.push(value);
		}
		const bytes = new Uint8Array(size);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.length;
		}
		return { bytes, type };
	};
}

// Best effort: a failed delete never breaks the reply.
export async function deleteTwilioMedia(
	accountSid: string,
	authToken: string,
	mediaUrl: string,
): Promise<void> {
	const target = twilioMediaUrl(mediaUrl, accountSid);
	if (!target) return;
	if (!target.pathname.endsWith(".json")) target.pathname += ".json";
	await fetch(target, {
		method: "DELETE",
		headers: { authorization: basicAuth(accountSid, authToken) },
	}).catch(() => {});
}

const xmlEntities: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&apos;",
};

export function twiml(reply: string): string {
	const body = reply.replace(/[&<>"']/g, (c) => xmlEntities[c] ?? c);
	return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${body}</Message></Response>`;
}
