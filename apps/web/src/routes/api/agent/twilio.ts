import Anthropic from "@anthropic-ai/sdk";
import {
	createAgentStore,
	createStoreIdentifier,
	createTwilioChannel,
	handleInbound,
} from "@cardmax/agent";
import { createFileRoute } from "@tanstack/react-router";

import { ENV } from "../../../env.server";
import { db } from "../../../services";

const channel =
	ENV.TWILIO_ACCOUNT_SID && ENV.TWILIO_AUTH_TOKEN && ENV.TWILIO_WEBHOOK_URL
		? createTwilioChannel({
				accountSid: ENV.TWILIO_ACCOUNT_SID,
				authToken: ENV.TWILIO_AUTH_TOKEN,
				webhookUrl: ENV.TWILIO_WEBHOOK_URL,
			})
		: null;
const store = createAgentStore(db, ENV.BETTER_AUTH_SECRET);
const identifyStore = ENV.ANTHROPIC_API_KEY
	? createStoreIdentifier(new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY }))
	: undefined;

// Twilio "A message comes in" webhook. Verifies the signature, answers with TwiML,
// then deletes any photo from Twilio. Message text is never logged or stored.
export const Route = createFileRoute("/api/agent/twilio")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (!channel) return new Response("Not found", { status: 404 });
				const inbound = await channel.parse(request);
				if (!inbound) return new Response("Forbidden", { status: 403 });

				const reply = await handleInbound(inbound, {
					store,
					webUrl: ENV.BETTER_AUTH_URL,
					fetchImage: channel.fetchImage,
					identifyStore,
				});
				if (inbound.imageUrl) {
					await channel.deleteMedia?.(inbound).catch(() => {
						console.error("Twilio media deletion failed");
					});
				}
				return new Response(channel.replyXml(reply), {
					headers: { "content-type": "text/xml" },
				});
			},
		},
	},
});
