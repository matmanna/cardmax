import { createHmac, randomInt } from "node:crypto";

export const linkCodeTtlMs = 10 * 60 * 1000;

export function generateLinkCode(): string {
	return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Codes are stored as a keyed hash, so a database read cannot link a phone.
export function hashLinkCode(code: string, secret: string): string {
	return createHmac("sha256", secret)
		.update(`link:${code}`)
		.digest("base64url");
}

// A text that is only a 6-digit code (spaces and dashes allowed, e.g. "482 913").
export function parseLinkCode(text: string): string | null {
	const digits = text.replace(/[\s-]/g, "");
	return /^\d{6}$/.test(digits) ? digits : null;
}

// Keyed hash of a phone number, used for lookups so the number is never stored.
export function hashPhone(phone: string, secret: string): string {
	return createHmac("sha256", secret)
		.update(`phone:${phone}`)
		.digest("base64url");
}
