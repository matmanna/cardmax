import { describe, expect, test } from "bun:test";

import { parseExtensionReply, sendToExtension } from "./extension";

const wallet = [{ cardId: "amex-gold", addedAt: "2026-10-22" }];

function fakeRuntime(reply: unknown, lastError?: { message?: string }) {
	const sent: unknown[] = [];
	return {
		sent,
		runtime: {
			lastError,
			sendMessage: (
				_id: string,
				message: unknown,
				callback: (r: unknown) => void,
			) => {
				sent.push(message);
				callback(reply);
			},
		},
	};
}

describe("parseExtensionReply", () => {
	test("accepts a wallet reply", () => {
		expect(parseExtensionReply({ wallet })).toEqual({ wallet });
	});

	test("turns garbage into an error", () => {
		expect(parseExtensionReply(undefined)).toHaveProperty("error");
		expect(parseExtensionReply({ wallet: "nope" })).toHaveProperty("error");
	});
});

describe("sendToExtension", () => {
	test("errors without an extension id", async () => {
		const { runtime } = fakeRuntime({ wallet });
		expect(
			await sendToExtension(undefined, { type: "cardmax:getWallet" }, runtime),
		).toHaveProperty("error");
	});

	test("errors when the extension is not installed", async () => {
		expect(
			await sendToExtension("abc", { type: "cardmax:getWallet" }, undefined),
		).toHaveProperty("error");
	});

	test("sends the message and parses the reply", async () => {
		const { runtime, sent } = fakeRuntime({ ok: true });
		const reply = await sendToExtension(
			"abc",
			{ type: "cardmax:setWallet", wallet },
			runtime,
		);
		expect(reply).toEqual({ ok: true });
		expect(sent).toEqual([{ type: "cardmax:setWallet", wallet }]);
	});

	test("reports chrome.runtime.lastError", async () => {
		const { runtime } = fakeRuntime(undefined, { message: "No receiver" });
		expect(
			await sendToExtension("abc", { type: "cardmax:getWallet" }, runtime),
		).toEqual({ error: "No receiver" });
	});
});
