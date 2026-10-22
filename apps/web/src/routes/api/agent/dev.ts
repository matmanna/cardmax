import { createAgentStore, handleInbound } from "@cardmax/agent";
import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import { ENV } from "../../../env.server";
import { db } from "../../../services";

// Provider-free channel for local testing: POST {from, text}, get {reply}.
// Real providers get their own route with signature checks. Disabled in production.
const devInbound = z.object({
	from: z.string().min(4).max(32),
	text: z.string().max(500),
});

const store = createAgentStore(db, ENV.BETTER_AUTH_SECRET);

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
					return Response.json({ error: "Send {from, text}" }, { status: 400 });
				}
				const reply = await handleInbound(parsed.data, {
					store,
					webUrl: ENV.BETTER_AUTH_URL,
				});
				return Response.json({ reply });
			},
		},
	},
});
