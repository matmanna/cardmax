import Anthropic from "@anthropic-ai/sdk";
import {
	createAgentStore,
	createStoreIdentifier,
	createTwilioImageFetcher,
	deleteTwilioMedia,
	handleInbound,
	parseTwilioMessage,
	twilioMediaUrls,
	twiml,
	verifyTwilioSignature,
} from "@cardmax/agent";
import { createFileRoute } from "@tanstack/react-router";

import { ENV } from "../../../env.server";
import { db } from "../../../services";

// Twilio SMS/MMS webhook ("A message comes in", HTTP POST). Fails closed: 404 until
// both Twilio credentials are set, 403 on a bad signature. Logs nothing about the message.
const store = createAgentStore(db, ENV.BETTER_AUTH_SECRET);
const identifyStore = ENV.ANTHROPIC_API_KEY
	? createStoreIdentifier(new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY }))
	: undefined;

export const Route = createFileRoute("/api/agent/twilio")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const accountSid = ENV.TWILIO_ACCOUNT_SID;
				const authToken = ENV.TWILIO_AUTH_TOKEN;
				if (!accountSid || !authToken) {
					return new Response("Not found", { status: 404 });
				}
				const type = request.headers.get("content-type") ?? "";
				if (!type.startsWith("application/x-www-form-urlencoded")) {
					return new Response("Unsupported media type", { status: 415 });
				}
				const params = Object.fromEntries(
					new URLSearchParams(await request.text()),
				);
				// Signed against the URL configured in Twilio; request.url differs behind Vercel.
				const url = `${ENV.BETTER_AUTH_URL.replace(/\/$/, "")}/api/agent/twilio`;
				const signature = request.headers.get("x-twilio-signature");
				if (!verifyTwilioSignature(authToken, url, params, signature)) {
					return new Response("Forbidden", { status: 403 });
				}
				const inbound = parseTwilioMessage(params);
				const reply = inbound
					? await handleInbound(inbound, {
							store,
							webUrl: ENV.BETTER_AUTH_URL,
							fetchImage: createTwilioImageFetcher(accountSid, authToken),
							identifyStore,
						})
					: null;
				// Don't leave photos sitting on Twilio.
				await Promise.all(
					twilioMediaUrls(params).map((media) =>
						deleteTwilioMedia(accountSid, authToken, media),
					),
				);
				const body = reply
					? twiml(reply)
					: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
				return new Response(body, {
					headers: { "content-type": "text/xml; charset=utf-8" },
				});
			},
		},
	},
});
