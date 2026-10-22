import twilio from "twilio";

import type { Channel, Inbound } from "./channel";
import type { FetchImage } from "./handle";
import { maxImageBytes } from "./vision";

export type TwilioConfig = {
	accountSid: string;
	authToken: string;
	// The exact URL configured on the number. Twilio signs it, so it must match byte for byte.
	webhookUrl: string;
};

// MediaUrl0 looks like .../Accounts/AC…/Messages/MM…/Media/ME…
const mediaPath = /\/Accounts\/(AC\w+)\/Messages\/(MM\w+)\/Media\/(ME\w+)$/;

export function twilioReplyXml(text: string): string {
	const response = new twilio.twiml.MessagingResponse();
	response.message(text);
	return response.toString();
}

// Maps a verified webhook form to Inbound. Only the first attachment, and only images.
export function inboundFromForm(form: Record<string, string>): Inbound | null {
	// WhatsApp senders arrive as "whatsapp:+1555…". Strip it so a phone links once for both.
	const from = form.From?.replace(/^whatsapp:/, "");
	if (!from) return null;
	const type = form.MediaContentType0 ?? "";
	const imageUrl =
		Number(form.NumMedia ?? 0) > 0 && type.startsWith("image/")
			? form.MediaUrl0
			: undefined;
	return { from, text: form.Body ?? "", imageUrl };
}

export function createTwilioChannel(
	config: TwilioConfig,
): Channel & { fetchImage: FetchImage; replyXml: typeof twilioReplyXml } {
	const client = twilio(config.accountSid, config.authToken);
	const basicAuth = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`;

	return {
		async parse(request) {
			const signature = request.headers.get("x-twilio-signature");
			if (!signature) return null;
			const body = new URLSearchParams(await request.text());
			const form = Object.fromEntries(body);
			if (
				!twilio.validateRequest(
					config.authToken,
					signature,
					config.webhookUrl,
					form,
				)
			) {
				return null;
			}
			return inboundFromForm(form);
		},

		// Replies go back as TwiML in the webhook response; see replyXml.
		async reply() {
			throw new Error("Twilio replies are sent as TwiML from the webhook");
		},

		// Media URLs need the account's credentials and redirect to a signed CDN URL.
		async fetchImage(url) {
			if (!url.startsWith("https://api.twilio.com/")) return null;
			const response = await fetch(url, {
				headers: { Authorization: basicAuth },
			});
			if (!response.ok) return null;
			const declared = Number(response.headers.get("content-length") ?? 0);
			if (declared > maxImageBytes) return null;
			const bytes = new Uint8Array(await response.arrayBuffer());
			if (bytes.length > maxImageBytes) return null;
			return { bytes, type: response.headers.get("content-type") ?? "" };
		},

		// Best effort: the photo leaves Twilio's storage once we've answered.
		async deleteMedia(inbound) {
			const match = inbound.imageUrl?.match(mediaPath);
			if (!match?.[2] || !match[3]) return;
			await client.messages(match[2]).media(match[3]).remove();
		},

		replyXml: twilioReplyXml,
	};
}
