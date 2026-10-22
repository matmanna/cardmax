import { type ExtensionMessage, walletCard } from "@cardmax/core";
import z from "zod";

// Replies the extension's onMessageExternal handler sends back.
const extensionReply = z.union([
	z.object({ wallet: z.array(walletCard) }),
	z.object({ ok: z.literal(true) }),
	z.object({ error: z.string() }),
]);
export type ExtensionReply = z.infer<typeof extensionReply>;

export function parseExtensionReply(raw: unknown): ExtensionReply {
	const parsed = extensionReply.safeParse(raw);
	if (parsed.success) return parsed.data;
	return { error: "The extension sent a reply this page does not understand" };
}

type ChromeRuntime = {
	sendMessage: (
		extensionId: string,
		message: unknown,
		callback: (reply: unknown) => void,
	) => void;
	lastError?: { message?: string };
};

function chromeRuntime(): ChromeRuntime | undefined {
	return (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome
		?.runtime;
}

// Only the web app starts this exchange; the extension only replies.
export function sendToExtension(
	extensionId: string | undefined,
	message: ExtensionMessage,
	runtime: ChromeRuntime | undefined = chromeRuntime(),
): Promise<ExtensionReply> {
	if (!extensionId) {
		return Promise.resolve({ error: "EXTENSION_ID is not configured" });
	}
	if (!runtime?.sendMessage) {
		return Promise.resolve({
			error: "Pointmaxx extension not found. Install it in Chrome and reload.",
		});
	}
	return new Promise((resolve) => {
		runtime.sendMessage(extensionId, message, (reply) => {
			if (runtime.lastError) {
				resolve({
					error: runtime.lastError.message ?? "The extension did not respond",
				});
				return;
			}
			resolve(parseExtensionReply(reply));
		});
	});
}
