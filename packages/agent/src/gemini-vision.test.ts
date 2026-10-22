import { describe, expect, test } from "bun:test";

import { createGeminiStoreIdentifier } from "./gemini-vision";
import { selectStoreIdentifier } from "./vision";

const image = { bytes: new Uint8Array([1, 2, 3]), type: "image/jpeg" as const };

function fakeFetch(status: number, body: unknown) {
	const calls: { url: string; init: RequestInit }[] = [];
	const impl = (async (url: string, init: RequestInit) => {
		calls.push({ url, init });
		return new Response(JSON.stringify(body), { status });
	}) as unknown as typeof fetch;
	return { impl, calls };
}

const reply = (guess: unknown) => ({
	candidates: [{ content: { parts: [{ text: JSON.stringify(guess) }] } }],
});

describe("createGeminiStoreIdentifier", () => {
	test("sends the stripped image once and parses the guess", async () => {
		const { impl, calls } = fakeFetch(
			200,
			reply({ name: "Target", domain: "target.com", confidence: "high" }),
		);
		const identify = createGeminiStoreIdentifier("k", "m", impl);
		expect(await identify(image)).toEqual({
			name: "Target",
			domain: "target.com",
			confidence: "high",
		});
		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).toContain("/models/m:generateContent");
		const headers = calls[0]?.init.headers as Record<string, string>;
		expect(headers["x-goog-api-key"]).toBe("k");
		expect(String(calls[0]?.url)).not.toContain("key=");
		const body = JSON.parse(String(calls[0]?.init.body));
		expect(body.contents[0].parts[0].inlineData.data).toBe("AQID");
	});

	test("returns null on errors and malformed output", async () => {
		expect(
			await createGeminiStoreIdentifier(
				"k",
				"m",
				fakeFetch(500, {}).impl,
			)(image),
		).toBeNull();
		expect(
			await createGeminiStoreIdentifier(
				"k",
				"m",
				fakeFetch(200, reply({ name: 1 })).impl,
			)(image),
		).toBeNull();
	});
});

describe("selectStoreIdentifier", () => {
	test("is undefined with no keys and prefers the configured provider", async () => {
		expect(await selectStoreIdentifier({})).toBeUndefined();
		expect(await selectStoreIdentifier({ geminiKey: "g" })).toBeFunction();
		expect(
			await selectStoreIdentifier({ provider: "gemini", anthropicKey: "a" }),
		).toBeFunction();
	});
});
