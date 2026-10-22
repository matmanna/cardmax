import { describe, expect, test } from "bun:test";

import { assertWalletConsent, walletInput } from "./wallet";

describe("walletInput", () => {
	test("keeps only cardId and addedAt", () => {
		const parsed = walletInput.parse([
			{ cardId: "chase-freedom", addedAt: "2026-10-22", last4: "4242" },
		]);
		expect(parsed).toEqual([
			{ cardId: "chase-freedom", addedAt: "2026-10-22" },
		]);
	});

	test("rejects cards without an id", () => {
		expect(() => walletInput.parse([{ addedAt: "2026-10-22" }])).toThrow();
	});

	test("caps the wallet size", () => {
		const cards = Array.from({ length: 101 }, (_, i) => ({
			cardId: `c${i}`,
			addedAt: "2026-10-22",
		}));
		expect(() => walletInput.parse(cards)).toThrow();
	});
});

describe("assertWalletConsent", () => {
	test("allows users who opted in", () => {
		expect(() =>
			assertWalletConsent({ walletSyncConsent: true }),
		).not.toThrow();
	});

	test("blocks users without consent", () => {
		expect(() => assertWalletConsent({ walletSyncConsent: false })).toThrow();
		expect(() => assertWalletConsent({})).toThrow();
	});
});
