import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import z from "zod";

import type { ImageType } from "./strip-metadata";

export const storeGuess = z.object({
	// null when the photo doesn't clearly show a store sign, logo or storefront.
	name: z.string().nullable(),
	domain: z.string().nullable(),
	confidence: z.enum(["high", "medium", "low"]),
});
export type StoreGuess = z.infer<typeof storeGuess>;

export type IdentifyStore = (image: {
	bytes: Uint8Array;
	type: ImageType;
}) => Promise<StoreGuess | null>;

// Shared by every photo reader, so Claude and Gemini get identical instructions.
export const storeIdentifierPrompt = `You identify retail stores from a photo of a storefront, sign, or logo.
Return only the store's identity: its common name and its main US website domain (for example "target.com").
Ignore people, faces, license plates, and any other text or objects in the frame, and never describe them.
If no store is clearly identifiable, return name and domain as null with low confidence.`;

// One request per photo. The image is sent once and nothing about it is stored.
export function createStoreIdentifier(client = new Anthropic()): IdentifyStore {
	return async ({ bytes, type }) => {
		const response = await client.messages.parse({
			model: "claude-haiku-5-5",
			max_tokens: 2048,
			system: storeIdentifierPrompt,
			output_config: { effort: "low", format: zodOutputFormat(storeGuess) },
			messages: [
				{
					role: "user",
					content: [
						{
							type: "image",
							source: {
								type: "base64",
								media_type: type,
								data: Buffer.from(bytes).toString("base64"),
							},
						},
						{ type: "text", text: "Which store is this?" },
					],
				},
			],
		});
		if (response.stop_reason === "refusal") return null;
		return response.parsed_output ?? null;
	};
}

// Max bytes we accept from any provider. Bigger photos get "text the name".
export const maxImageBytes = 5 * 1024 * 1024;

// For the dev channel: decodes a data: URL. Providers supply their own fetcher.
export async function fetchDataUrl(
	url: string,
): Promise<{ bytes: Uint8Array; type: string } | null> {
	const match = url.match(/^data:(image\/[a-z]+);base64,(.+)$/);
	if (!match?.[1] || !match[2]) return null;
	const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
	return bytes.length <= maxImageBytes ? { bytes, type: match[1] } : null;
}

// Picks the photo reader from whichever key is configured. Gemini wins when
// VISION_PROVIDER says so, or when it's the only key set.
export async function selectStoreIdentifier(env: {
	provider?: "anthropic" | "gemini";
	anthropicKey?: string;
	geminiKey?: string;
	geminiModel?: string;
}): Promise<IdentifyStore | undefined> {
	const wantGemini =
		env.provider === "gemini" || (!env.provider && !env.anthropicKey);
	if (wantGemini && env.geminiKey) {
		const { createGeminiStoreIdentifier } = await import("./gemini-vision");
		return createGeminiStoreIdentifier(
			env.geminiKey,
			env.geminiModel || undefined,
		);
	}
	if (env.anthropicKey) {
		return createStoreIdentifier(new Anthropic({ apiKey: env.anthropicKey }));
	}
	return undefined;
}
