import { extensionMessage, type WalletCard } from "@cardmax/core";
import { getSettings, getWallet, setWallet } from "@/lib/storage";

// Same fallback as externally_connectable in wxt.config.ts.
const webOrigin =
	(import.meta.env.WXT_WEB_ORIGIN as string | undefined) ??
	"http://localhost:3001";

type Reply = { wallet: WalletCard[] } | { ok: true } | { error: string };

async function handle(
	message: unknown,
	sender: Browser.runtime.MessageSender,
): Promise<Reply> {
	if (sender.origin !== webOrigin) {
		return { error: "Sender not allowed" };
	}
	const parsed = extensionMessage.safeParse(message);
	if (!parsed.success) return { error: "Invalid message" };
	switch (parsed.data.type) {
		case "cardmax:getWallet":
			return { wallet: await getWallet() };
		case "cardmax:setWallet": {
			// Revoked users stay revoked until they re-enable sends in the popup.
			const { sendsEnabled } = await getSettings();
			if (!sendsEnabled) return { error: "Sync is turned off on this device" };
			await setWallet(parsed.data.wallet);
			return { ok: true };
		}
	}
}

export default defineBackground(() => {
	browser.runtime.onMessageExternal.addListener(
		(message, sender, sendResponse) => {
			handle(message, sender)
				.then(sendResponse)
				.catch(() => sendResponse({ error: "Internal error" }));
			// Keep the channel open for the async reply.
			return true;
		},
	);
});
