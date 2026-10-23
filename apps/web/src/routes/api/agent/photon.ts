import {
	createAgentStore,
	createPhotonWebhook,
	handleInbound,
} from "@cardmax/agent";
import { createFileRoute } from "@tanstack/react-router";

import { ENV } from "../../../env.server";
import { db } from "../../../services";
import { identifyStorePromise } from "../../../vision.server";

const store = createAgentStore(db, ENV.BETTER_AUTH_SECRET);

// Photon (iMessage) webhook. The Spectrum SDK verifies X-Spectrum-Signature and
// hands back a live space to reply into. Message text is never logged or stored.
const photonWebhook =
	ENV.SPECTRUM_PROJECT_ID &&
	ENV.SPECTRUM_PROJECT_SECRET &&
	ENV.SPECTRUM_WEBHOOK_SECRET
		? createPhotonWebhook(
				{
					projectId: ENV.SPECTRUM_PROJECT_ID,
					projectSecret: ENV.SPECTRUM_PROJECT_SECRET,
					webhookSecret: ENV.SPECTRUM_WEBHOOK_SECRET,
				},
				async (inbound, fetchImage) =>
					handleInbound(inbound, {
						store,
						webUrl: ENV.BETTER_AUTH_URL,
						fetchImage,
						identifyStore: await identifyStorePromise,
					}),
			)
		: null;

export const Route = createFileRoute("/api/agent/photon")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				if (!photonWebhook) return new Response("Not found", { status: 404 });
				return photonWebhook(request);
			},
		},
	},
});
