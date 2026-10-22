import { describe, expect, test } from "bun:test";
import type { WalletCard } from "@cardmax/core";

import { type AgentStore, handleInbound } from "./handle";
import { privacyNotice } from "./replies";

const webUrl = "https://cardmax.test";

function fakeStore(init: {
	phones?: Record<string, string>;
	codes?: Record<string, string>;
	wallets?: Record<string, WalletCard[]>;
	attemptsLeft?: number;
}) {
	const phones = new Map(Object.entries(init.phones ?? {}));
	const codes = new Map(Object.entries(init.codes ?? {}));
	const wallets = init.wallets ?? {};
	let attemptsLeft = init.attemptsLeft ?? 5;
	const store: AgentStore = {
		userForPhone: async (phone) => phones.get(phone) ?? null,
		consumeLinkCode: async (code) => {
			const userId = codes.get(code) ?? null;
			codes.delete(code);
			return userId;
		},
		linkPhone: async (userId, phone) => {
			phones.set(phone, userId);
		},
		unlinkPhone: async (phone) => {
			phones.delete(phone);
		},
		walletFor: async (userId) => wallets[userId] ?? [],
		allowCodeAttempt: async () => attemptsLeft-- > 0,
	};
	return { store, phones, codes };
}

const card = (cardId: string) => ({ cardId, addedAt: "2026-10-22" });
const send = (store: AgentStore, text: string, from = "+15550001234") =>
	handleInbound({ from, text }, { store, webUrl });

describe("linking", () => {
	test("an unknown number gets link instructions and the privacy notice", async () => {
		const { store } = fakeStore({});
		const reply = await send(store, "costco");
		expect(reply).toContain(`${webUrl}/sync`);
		expect(reply).toContain(privacyNotice);
	});

	test("a valid code links the number once", async () => {
		const { store, phones, codes } = fakeStore({ codes: { "482913": "u1" } });
		const reply = await send(store, "482 913");
		expect(reply).toStartWith("Linked.");
		expect(reply).toContain(privacyNotice);
		expect(phones.get("+15550001234")).toBe("u1");
		expect(codes.size).toBe(0);
		expect(await send(store, "482913", "+15559999999")).toContain(
			"wrong or expired",
		);
	});

	test("a wrong code is rejected", async () => {
		const { store, phones } = fakeStore({ codes: { "482913": "u1" } });
		expect(await send(store, "111111")).toContain("wrong or expired");
		expect(phones.size).toBe(0);
	});

	test("code guessing is throttled", async () => {
		const { store } = fakeStore({ codes: { "482913": "u1" }, attemptsLeft: 0 });
		expect(await send(store, "482913")).toContain("Too many tries");
	});

	test("UNLINK disconnects the number", async () => {
		const { store, phones } = fakeStore({ phones: { "+15550001234": "u1" } });
		expect(await send(store, " unlink ")).toStartWith("Unlinked.");
		expect(phones.size).toBe(0);
	});
});

describe("recommendations", () => {
	const linked = (cards: string[]) =>
		fakeStore({
			phones: { "+15550001234": "u1" },
			wallets: { u1: cards.map(card) },
		}).store;

	test("compares the synced wallet for a curated store", async () => {
		const store = linked(["citi-double-cash", "amex-blue-cash-preferred"]);
		const reply = await send(store, "which card for Whole Foods?");
		expect(reply).toContain("wholefoodsmarket.com");
		expect(reply).toContain("grocery, high confidence");
		expect(reply).toContain("Top earner: American Express Blue Cash Preferred");
		expect(reply).toContain("per $100");
		expect(reply).toContain("Rewards math, not financial advice.");
	});

	test("flags low-confidence guesses", async () => {
		const store = linked(["citi-double-cash"]);
		const reply = await send(store, "example-shop.com");
		expect(reply).toContain("low confidence");
		expect(reply).toContain("is a guess");
	});

	test("asks for a website when the store is unknown", async () => {
		const store = linked(["citi-double-cash"]);
		expect(await send(store, "zzqx")).toContain("Text its website");
	});

	test("points to sync when the wallet is empty", async () => {
		const store = linked([]);
		expect(await send(store, "costco")).toContain(`${webUrl}/sync`);
	});

	test("replies never tell the user what to do with money", async () => {
		const store = linked([
			"citi-double-cash",
			"amex-gold",
			"chase-freedom-unlimited",
		]);
		for (const text of ["costco", "starbucks", "delta.com", "target"]) {
			const reply = (await send(store, text)).toLowerCase();
			expect(reply).not.toMatch(
				/\b(you should|we recommend|best for you|apply)\b/,
			);
			expect(reply).not.toMatch(/how much|amount|card number|last four/);
		}
	});
});
