import { answerFor } from "@cardmax/agent/handle";
import { createAgentStore } from "@cardmax/agent/store";
import { fetchDataUrl, maxImageBytes } from "@cardmax/agent/vision";
import z from "zod";

import { protectedProcedure } from "../index";
import { enforceRateLimit } from "../rate-limit";

// Base64 grows bytes by 4/3, plus room for the data: prefix.
const maxDataUrlLength = Math.ceil((maxImageBytes * 4) / 3) + 64;

const tryInput = z
	.object({
		text: z.string().max(200).optional(),
		imageUrl: z
			.string()
			.max(maxDataUrlLength)
			.regex(/^data:image\/(jpeg|png);base64,/)
			.optional(),
	})
	.refine(
		(input) => input.text?.trim() || input.imageUrl,
		"Send a store name or a photo",
	);

export const agentRouter = {
	// The web "Try it" panel: the same answer the text agent gives, for the
	// signed-in user, without a phone. Nothing is stored; the photo lives only
	// in this request.
	try: protectedProcedure
		.input(tryInput)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;
			await enforceRateLimit(context.db, `user:${userId}`, {
				name: "agent-try",
				limit: 20,
				windowMs: 60 * 60 * 1000,
			});
			const reply = await answerFor(userId, input, {
				store: createAgentStore(context.db, context.agentSecret),
				webUrl: context.agent.webUrl,
				fetchImage: fetchDataUrl,
				identifyStore: context.agent.identifyStore,
			});
			return { reply };
		}),
};
