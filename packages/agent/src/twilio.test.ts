import { describe, expect, test } from "bun:test";
import twilio from "twilio";

import { createTwilioChannel, inboundFromForm, twilioReplyXml } from "./twilio";

const config = {
	accountSid: `AC${"0".repeat(32)}`,
	authToken: "test-auth-token-0123456789abcdef",
	webhookUrl: "https://cardmax.test/api/agent/twilio",
};
const channel = createTwilioChannel(config);

const form = {
	From: "+15551112222",
	To: "+15553334444",
	Body: "costco",
	NumMedia: "0",
	MessageSid: `SM${"1".repeat(32)}`,
};

function signedRequest(
	params: Record<string, string>,
	{ url = config.webhookUrl, token = config.authToken, body = params } = {},
) {
	const signature = twilio.getExpectedTwilioSignature(token, url, params);
	return new Request(config.webhookUrl, {
		method: "POST",
		headers: {
			"content-type": "application/x-www-form-urlencoded",
			"x-twilio-signature": signature,
		},
		body: new URLSearchParams(body).toString(),
	});
}

describe("parse", () => {
	test("accepts a correctly signed webhook", async () => {
		expect(await channel.parse(signedRequest(form))).toEqual({
			from: "+15551112222",
			text: "costco",
			imageUrl: undefined,
		});
	});

	test("rejects a tampered body", async () => {
		const request = signedRequest(form, {
			body: { ...form, From: "+15550000000" },
		});
		expect(await channel.parse(request)).toBeNull();
	});

	test("rejects a signature for another URL", async () => {
		const request = signedRequest(form, { url: "https://evil.example/hook" });
		expect(await channel.parse(request)).toBeNull();
	});

	test("rejects the wrong auth token", async () => {
		const request = signedRequest(form, { token: "not-the-token" });
		expect(await channel.parse(request)).toBeNull();
	});

	test("rejects a missing signature", async () => {
		const request = new Request(config.webhookUrl, {
			method: "POST",
			body: new URLSearchParams(form).toString(),
		});
		expect(await channel.parse(request)).toBeNull();
	});
});

describe("inboundFromForm", () => {
	const media =
		"https://api.twilio.com/2010-04-01/Accounts/AC1/Messages/MM1/Media/ME1";

	test("keeps the first image attachment", () => {
		expect(
			inboundFromForm({
				...form,
				Body: "",
				NumMedia: "1",
				MediaUrl0: media,
				MediaContentType0: "image/jpeg",
			}),
		).toEqual({ from: form.From, text: "", imageUrl: media });
	});

	test("ignores non-image attachments", () => {
		expect(
			inboundFromForm({
				...form,
				NumMedia: "1",
				MediaUrl0: media,
				MediaContentType0: "text/vcard",
			})?.imageUrl,
		).toBeUndefined();
	});

	test("needs a sender", () => {
		expect(inboundFromForm({ Body: "hi" })).toBeNull();
	});
});

describe("twilioReplyXml", () => {
	test("escapes reply text", () => {
		const xml = twilioReplyXml('Use <Card> & "save" 4x');
		expect(xml).toContain("&lt;Card&gt; &amp;");
		expect(xml).toStartWith(
			'<?xml version="1.0" encoding="UTF-8"?><Response><Message>',
		);
	});
});

describe("fetchImage", () => {
	test("refuses URLs outside api.twilio.com", async () => {
		expect(await channel.fetchImage("https://evil.example/x.jpg")).toBeNull();
	});
});
