import Anthropic from "@anthropic-ai/sdk";
import {
	createAgentStore,
	createStoreIdentifier,
	fetchDataUrl,
	handleInbound,
} from "@cardmax/agent";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import { ENV } from "../../../env.server";
import { db } from "../../../services";

// Provider-free channel for local testing: POST {from, text}, get {reply}.
// Real providers get their own route with signature checks. Disabled in production.
const devInbound = z.object({
	from: z.string().min(4).max(32),
	text: z.string().max(500).optional(),
	// A data:image/jpeg;base64,... URL stands in for a provider media link.
	imageUrl: z.string().max(8_000_000).optional(),
});

const store = createAgentStore(db, ENV.BETTER_AUTH_SECRET);
const identifyStore = ENV.ANTHROPIC_API_KEY
	? createStoreIdentifier(new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY }))
	: undefined;

export const Route = createFileRoute("/api/agent/dev")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (ENV.NODE_ENV === "production") {
					return new Response("Not found", { status: 404 });
				}
				const parsed = devInbound.safeParse(
					await request.json().catch(() => null),
				);
				if (!parsed.success) {
					return Response.json(
						{ error: "Send {from, text?, imageUrl?}" },
						{ status: 400 },
					);
				}
				const reply = await handleInbound(parsed.data, {
					store,
					webUrl: ENV.BETTER_AUTH_URL,
					fetchImage: fetchDataUrl,
					identifyStore,
				});
				return Response.json({ reply });
			},
		},
	},
});
