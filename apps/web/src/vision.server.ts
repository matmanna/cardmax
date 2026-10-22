import { selectStoreIdentifier } from "@cardmax/agent/vision";

import { ENV } from "./env.server";

// The storefront photo reader, shared by the web "Try it" panel and every text
// channel. Undefined without a key, and then photos get "text the name".
export const identifyStorePromise = selectStoreIdentifier({
	provider: ENV.VISION_PROVIDER || undefined,
	anthropicKey: ENV.ANTHROPIC_API_KEY || undefined,
	geminiKey: ENV.GEMINI_API_KEY || undefined,
	geminiModel: ENV.GEMINI_MODEL || undefined,
});
