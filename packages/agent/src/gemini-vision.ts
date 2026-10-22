import type { IdentifyStore } from "./vision";
import { storeGuess, storeIdentifierPrompt } from "./vision";

export const defaultGeminiModel = "gemini-3.8-flash";

// JSON schema for storeGuess, in the form Gemini's structured output accepts.
const responseJsonSchema = {
	type: "object",
	properties: {
		name: { type: ["string", "null"] },
		domain: { type: ["string", "null"] },
		confidence: { type: "string", enum: ["high", "medium", "low"] },
	},
	required: ["name", "domain", "confidence"],
};

type GeminiResponse = {
	candidates?: { content?: { parts?: { text?: string }[] } }[];
};

// Same contract as the Claude reader: one request per photo, nothing stored.
// On the free Gemini tier Google may use inputs to improve its products, so
// use a key from a billing-enabled project for anything real.
export function createGeminiStoreIdentifier(
	apiKey: string,
	model = defaultGeminiModel,
	fetchImpl: typeof fetch = fetch,
): IdentifyStore {
	return async ({ bytes, type }) => {
		const response = await fetchImpl(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-goog-api-key": apiKey,
				},
				body: JSON.stringify({
					systemInstruction: { parts: [{ text: storeIdentifierPrompt }] },
					contents: [
						{
							role: "user",
							parts: [
								{
									inlineData: {
										mimeType: type,
										data: Buffer.from(bytes).toString("base64"),
									},
								},
								{ text: "Which store is this?" },
							],
						},
					],
					generationConfig: {
						responseMimeType: "application/json",
						responseJsonSchema,
					},
				}),
			},
		);
		if (!response.ok) return null;
		const body = (await response.json()) as GeminiResponse;
		const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
		if (!text) return null;
		const parsed = storeGuess.safeParse(JSON.parse(text));
		return parsed.success ? parsed.data : null;
	};
}
