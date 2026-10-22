import { describe, expect, test } from "bun:test";
import { catalog } from "@cardmax/core";

import { assertWalletConsent, walletInput } from "./wallet";

const cardId = catalog[0]?.id ?? "";

describe("walletInput", () => {
	test("keeps only cardId and addedAt", () => {
		const parsed = walletInput.parse([
			{ cardId, addedAt: "2026-10-22", last4: "4242" },
		]);
		expect(parsed).toEqual([{ cardId, addedAt: "2026-10-22" }]);
	});

	test("rejects cards without an id", () => {
		expect(() => walletInput.parse([{ addedAt: "2026-10-22" }])).toThrow();
	});

	test("rejects ids that are not in the catalog", () => {
		expect(() =>
			walletInput.parse([{ cardId: "my secret note", addedAt: "2026-10-22" }]),
		).toThrow();
	});

	test("rejects long addedAt values", () => {
		expect(() =>
			walletInput.parse([{ cardId, addedAt: "x".repeat(41) }]),
		).toThrow();
	});

	test("caps the wallet size", () => {
		const cards = Array.from({ length: 101 }, () => ({
			cardId,
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
