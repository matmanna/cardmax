import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

import type { Inbound } from "./channel";
import type { FetchImage } from "./handle";
import { maxImageBytes } from "./vision";

export type PhotonConfig = {
	projectId: string;
	projectSecret: string;
	// Per-webhook signing secret, returned once when the webhook is registered.
	webhookSecret: string;
};

// Attachments have no URL in Photon webhooks; we pass the id through imageUrl.
const attachmentPrefix = "photon-attachment:";

type SlimContent = {
	type: string;
	text?: string;
	id?: string;
	mimeType?: string;
};

// Maps a resolved Photon message to Inbound. Images only, other content is ignored.
export function inboundFromPhoton(message: {
	sender?: { id: string };
	content: SlimContent;
}): Inbound | null {
	const from = message.sender?.id;
	if (!from) return null;
	const { content } = message;
	if (content.type === "text") return { from, text: content.text ?? "" };
	if (content.type === "attachment" && content.mimeType?.startsWith("image/")) {
		return { from, imageUrl: `${attachmentPrefix}${content.id}` };
	}
	return null;
}

export type PhotonReply = (
	inbound: Inbound,
	fetchImage: FetchImage,
) => Promise<string>;

// Photon delivers at least once; skip redeliveries this instance has already answered.
const recentlyHandled = new Set<string>();
function firstDelivery(id: string): boolean {
	if (recentlyHandled.has(id)) return false;
	recentlyHandled.add(id);
	if (recentlyHandled.size > 500) {
		const oldest = recentlyHandled.values().next().value;
		if (oldest) recentlyHandled.delete(oldest);
	}
	return true;
}

// Webhook handler for serverless: verifies the signature (Spectrum SDK), answers,
// and only returns once the reply is sent, because the SDK runs the message handler
// fire-and-forget and a frozen function would drop it.
export function createPhotonWebhook(config: PhotonConfig, reply: PhotonReply) {
	const app = Spectrum({
		projectId: config.projectId,
		projectSecret: config.projectSecret,
		webhookSecret: config.webhookSecret,
		providers: [imessage.config()],
		telemetry: false,
	});

	return async (request: Request): Promise<Response> => {
		const spectrum = await app;
		let work: Promise<void> | undefined;
		let markStarted: () => void = () => {};
		const started = new Promise<void>((resolve) => {
			markStarted = resolve;
		});

		const response = await spectrum.webhook(request, (space, message) => {
			markStarted();
			const inbound = inboundFromPhoton(
				message as unknown as Parameters<typeof inboundFromPhoton>[0],
			);
			if (!inbound || !firstDelivery(message.id)) return;
			const phone = (space as unknown as { phone?: string }).phone;
			const fetchImage: FetchImage = async (url) => {
				if (!url.startsWith(attachmentPrefix)) return null;
				const attachment = await imessage(spectrum).getAttachment(
					url.slice(attachmentPrefix.length),
					phone,
				);
				if (!attachment) return null;
				const bytes = new Uint8Array(await attachment.read());
				if (bytes.length > maxImageBytes) return null;
				return { bytes, type: attachment.mimeType };
			};
			work = reply(inbound, fetchImage).then(async (text) => {
				await space.send(text);
			});
			return work;
		});

		// Non-message events never call the handler; don't wait on those.
		if (response.ok) {
			await Promise.race([
				started,
				new Promise((resolve) => setTimeout(resolve, 250)),
			]);
			await work?.catch(() => console.error("Photon reply failed"));
		}
		return response;
	};
}
