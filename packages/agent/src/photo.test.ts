import { describe, expect, test } from "bun:test";

import { type AgentStore, type FetchImage, handleInbound } from "./handle";
import type { IdentifyStore, StoreGuess } from "./vision";

const store: AgentStore = {
	userForPhone: async () => "u1",
	consumeLinkCode: async () => null,
	linkPhone: async () => {},
	unlinkPhone: async () => {},
	walletFor: async () => [
		{ cardId: "amex-blue-cash-preferred", addedAt: "x" },
		{ cardId: "citi-double-cash", addedAt: "x" },
	],
	allowCodeAttempt: async () => true,
};

// Smallest valid JPEG shape: SOI, APP1 with GPS, SOS, data, EOI.
const exifJpeg = Uint8Array.from([
	0xff,
	0xd8,
	0xff,
	0xe1,
	0x00,
	0x0d,
	...new TextEncoder().encode("GPS 40.7N!!"),
	0xff,
	0xda,
	0x00,
	0x02,
	0x01,
	0xff,
	0xd9,
]);

function deps(guess: StoreGuess | null | Error, type = "image/jpeg") {
	const seenBytes: Uint8Array[] = [];
	const fetchImage: FetchImage = async () => ({ bytes: exifJpeg, type });
	const identifyStore: IdentifyStore = async ({ bytes }) => {
		seenBytes.push(bytes);
		if (guess instanceof Error) throw guess;
		return guess;
	};
	return {
		seenBytes,
		deps: { store, webUrl: "https://x", fetchImage, identifyStore },
	};
}

const photo = { from: "+15550001234", imageUrl: "https://media.example/1" };

describe("storefront photos", () => {
	test("identifies the store and recommends, with a correction prompt when unsure", async () => {
		const { deps: d, seenBytes } = deps({
			name: "Whole Foods Market",
			domain: "wholefoodsmarket.com",
			confidence: "medium",
		});
		const reply = await handleInbound(photo, d);
		expect(reply).toStartWith(
			"Looks like Whole Foods Market (medium confidence). Wrong store? Reply with its name.",
		);
		expect(reply).toContain("Top earner: American Express Blue Cash Preferred");
		// The model only ever sees the stripped bytes.
		expect(new TextDecoder().decode(seenBytes[0])).not.toContain("GPS");
	});

	test("high confidence skips the correction prompt", async () => {
		const { deps: d } = deps({
			name: "Costco",
			domain: "costco.com",
			confidence: "high",
		});
		const reply = await handleInbound(photo, d);
		expect(reply).toStartWith("Looks like Costco (high confidence).\n");
		expect(reply).not.toContain("Wrong store?");
	});

	test("asks for the name when the model can't tell", async () => {
		const { deps: d } = deps({ name: null, domain: null, confidence: "low" });
		expect(await handleInbound(photo, d)).toContain("Text its name instead");
	});

	test("asks for the name when identification fails", async () => {
		const { deps: d } = deps(new Error("overloaded"));
		expect(await handleInbound(photo, d)).toContain("Text its name instead");
	});

	test("unsupported formats never reach the model", async () => {
		const { deps: d, seenBytes } = deps(
			{ name: "Costco", domain: "costco.com", confidence: "high" },
			"image/heic",
		);
		expect(await handleInbound(photo, d)).toContain("Text its name instead");
		expect(seenBytes).toHaveLength(0);
	});

	test("a typed store name wins over the photo", async () => {
		const { deps: d, seenBytes } = deps({
			name: "Costco",
			domain: "costco.com",
			confidence: "high",
		});
		const reply = await handleInbound({ ...photo, text: "starbucks" }, d);
		expect(reply).toContain("starbucks.com");
		expect(seenBytes).toHaveLength(0);
	});

	test("without vision configured, photos get the fallback", async () => {
		expect(
			await handleInbound(photo, { store, webUrl: "https://x" }),
		).toContain("Text its name instead");
	});
});
