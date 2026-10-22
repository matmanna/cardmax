import { afterEach, describe, expect, mock, test } from "bun:test";

import {
	createTwilioImageFetcher,
	deleteTwilioMedia,
	parseTwilioMessage,
	twilioMediaUrls,
	twiml,
	verifyTwilioSignature,
} from "./twilio";
import { maxImageBytes } from "./vision";

// Worked example from https://www.twilio.com/docs/usage/security
const token = "12345";
const url = "https://example.com/myapp.php?foo=1&bar=2";
const params = {
	CallSid: "CA1234567890ABCDE",
	Caller: "+14158675310",
	Digits: "1234",
	From: "+14158675310",
	To: "+18005551212",
};
const signature = "L/OH5YylLD5NRKLltdqwSvS0BnU=";

describe("verifyTwilioSignature", () => {
	test("accepts Twilio's published example", () => {
		expect(verifyTwilioSignature(token, url, params, signature)).toBe(true);
	});

	test("rejects a tampered param", () => {
		const tampered = { ...params, Digits: "1235" };
		expect(verifyTwilioSignature(token, url, tampered, signature)).toBe(false);
	});

	test("rejects an added param", () => {
		const added = { ...params, Body: "hi" };
		expect(verifyTwilioSignature(token, url, added, signature)).toBe(false);
	});

	test("rejects the wrong URL", () => {
		const other = "https://example.com/myapp.php?foo=1&bar=3";
		expect(verifyTwilioSignature(token, other, params, signature)).toBe(false);
	});

	test("rejects the wrong token", () => {
		expect(verifyTwilioSignature("54321", url, params, signature)).toBe(false);
	});

	test("rejects a missing or malformed signature", () => {
		expect(verifyTwilioSignature(token, url, params, null)).toBe(false);
		expect(verifyTwilioSignature(token, url, params, "")).toBe(false);
		expect(verifyTwilioSignature(token, url, params, "nope")).toBe(false);
	});
});

describe("parseTwilioMessage", () => {
	test("text only", () => {
		expect(
			parseTwilioMessage({
				From: "+15550001234",
				Body: "target",
				NumMedia: "0",
			}),
		).toEqual({ from: "+15550001234", text: "target" });
	});

	test("image", () => {
		expect(
			parseTwilioMessage({
				From: "+15550001234",
				Body: "",
				NumMedia: "1",
				MediaUrl0: "https://api.twilio.com/m/0",
				MediaContentType0: "image/jpeg",
			}),
		).toEqual({ from: "+15550001234", imageUrl: "https://api.twilio.com/m/0" });
	});

	test("skips a non-image attachment", () => {
		const parsed = parseTwilioMessage({
			From: "+15550001234",
			NumMedia: "2",
			MediaUrl0: "https://api.twilio.com/m/0",
			MediaContentType0: "text/vcard",
			MediaUrl1: "https://api.twilio.com/m/1",
			MediaContentType1: "image/png",
		});
		expect(parsed?.imageUrl).toBe("https://api.twilio.com/m/1");
	});

	test("ignores a lone non-image attachment", () => {
		expect(
			parseTwilioMessage({
				From: "+15550001234",
				NumMedia: "1",
				MediaUrl0: "https://api.twilio.com/m/0",
				MediaContentType0: "video/mp4",
			}),
		).toEqual({ from: "+15550001234" });
	});

	test("missing From is null", () => {
		expect(parseTwilioMessage({ Body: "target" })).toBeNull();
	});

	test("lists every media URL for deletion", () => {
		expect(
			twilioMediaUrls({ NumMedia: "2", MediaUrl0: "a", MediaUrl1: "b" }),
		).toEqual(["a", "b"]);
	});
});

describe("twiml", () => {
	test("escapes XML", () => {
		expect(twiml(`Use <Amex> & "Citi" at Lowe's`)).toBe(
			'<?xml version="1.0" encoding="UTF-8"?><Response><Message>Use &lt;Amex&gt; &amp; &quot;Citi&quot; at Lowe&apos;s</Message></Response>',
		);
	});
});

const sid = "AC123";
const media = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/MM1/Media/ME1`;
const realFetch = globalThis.fetch;

function mockFetch(respond: () => Response) {
	const calls: { url: string; init?: RequestInit }[] = [];
	globalThis.fetch = mock(
		async (input: string | URL | Request, init?: RequestInit) => {
			calls.push({ url: String(input), init });
			return respond();
		},
	) as unknown as typeof fetch;
	return calls;
}

afterEach(() => {
	globalThis.fetch = realFetch;
});

describe("createTwilioImageFetcher", () => {
	const fetchImage = createTwilioImageFetcher(sid, "tok");

	test("downloads with Basic auth", async () => {
		const calls = mockFetch(
			() =>
				new Response(new Uint8Array([1, 2, 3]), {
					headers: { "content-type": "image/jpeg" },
				}),
		);
		const image = await fetchImage(media);
		expect(image?.type).toBe("image/jpeg");
		expect([...(image?.bytes ?? [])]).toEqual([1, 2, 3]);
		const headers = calls[0]?.init?.headers as Record<string, string>;
		expect(headers.authorization).toBe(
			`Basic ${Buffer.from(`${sid}:tok`).toString("base64")}`,
		);
	});

	test("rejects non-Twilio hosts without fetching", async () => {
		const calls = mockFetch(() => new Response("x"));
		for (const bad of [
			"https://evil.example/2010-04-01/Accounts/AC123/x",
			"http://api.twilio.com/2010-04-01/Accounts/AC123/x",
			"https://api.twilio.com.evil.example/2010-04-01/Accounts/AC123/x",
			"https://api.twilio.com/2010-04-01/Accounts/ACother/x",
			"http://169.254.169.254/latest/meta-data",
			"not a url",
		]) {
			expect(await fetchImage(bad)).toBeNull();
		}
		expect(calls).toHaveLength(0);
	});

	test("rejects a declared size over the cap", async () => {
		mockFetch(
			() =>
				new Response("x", {
					headers: {
						"content-type": "image/jpeg",
						"content-length": String(maxImageBytes + 1),
					},
				}),
		);
		expect(await fetchImage(media)).toBeNull();
	});

	test("stops reading past the cap when no length is sent", async () => {
		const chunk = new Uint8Array(1024 * 1024);
		let sent = 0;
		const stream = new ReadableStream<Uint8Array>({
			pull(controller) {
				sent++;
				if (sent > 20) controller.close();
				else controller.enqueue(chunk);
			},
		});
		mockFetch(
			() => new Response(stream, { headers: { "content-type": "image/jpeg" } }),
		);
		expect(await fetchImage(media)).toBeNull();
		expect(sent).toBeLessThan(10);
	});
});

describe("deleteTwilioMedia", () => {
	test("sends DELETE to the .json resource", async () => {
		const calls = mockFetch(() => new Response(null, { status: 204 }));
		await deleteTwilioMedia(sid, "tok", media);
		expect(calls[0]?.url).toBe(`${media}.json`);
		expect(calls[0]?.init?.method).toBe("DELETE");
	});

	test("never throws and skips foreign hosts", async () => {
		const calls = mockFetch(() => {
			throw new Error("network");
		});
		await deleteTwilioMedia(sid, "tok", media);
		await deleteTwilioMedia(sid, "tok", "https://evil.example/x");
		expect(calls).toHaveLength(1);
	});
});
