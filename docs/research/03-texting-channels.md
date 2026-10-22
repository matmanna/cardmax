# Cardmax research 3: channels (2026-10-22)

Extends `docs/research/02-photon-product-apis.md`.

## 1. Photon / Spectrum

- **Android users.** The iMessage user object has a `service` field typed `"iMessage" | "SMS" | "RCS" | "unknown"`, so the SDK can represent SMS and RCS senders. https://photon.codes/docs/spectrum-ts/providers/imessage/connection-and-routing.md . No Stable doc covers SMS, RCS or Android. https://photon.codes/docs/llms.txt
- **UNVERIFIED:** whether an Android SMS or RCS sent to a **Free shared-pool** number reaches the agent, or whether it is dropped or bounced. The pricing page lists "RCS and SMS fallback" (https://photon.codes/pricing), but that describes outbound fallback.
- **Photon's own Telegram provider** is the documented route for non-Apple users from the same codebase. https://photon.codes/docs/spectrum-ts/providers/telegram/setup.md
- **Images.** Inbound content arrives as a union. Photos come through as `{type:"attachment", id, name, mimeType, size}` with a mimeType such as `image/heic` or `image/jpeg`. https://photon.codes/docs/webhooks/events.md
  - **Webhooks carry metadata only, never the bytes and never a download URL.** To get the bytes you run a `spectrum-ts` instance and call `imessage(app).getAttachment(id)`, then `.read()`. https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/fetching-attachments.md
  - `getAttachment` is cloud-only. In `imessage-local`, attachments come inline in the message content instead. Same URL.
  - Convert **HEIC** before vision.
  - Image receipt over SMS or MMS fallback: UNVERIFIED.
- **Free tier.** The pricing footnote says the Direct Messaging API "supports plain text, rich text, file attachments". Which tiers that applies to is unclear, so **UNVERIFIED** for Free. https://photon.codes/pricing
- **Testing without an iPhone.** The **terminal provider** TUI accepts drag-and-drop files, which arrive "with name, MIME type, and buffer". https://photon.codes/docs/spectrum-ts/providers/terminal/interactions.md . I found no web simulator.

## 2. Twilio SMS/MMS

**The trial is effectively unusable for a bot.** The current Console trial has these limits (https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account):
- 100 free SMS units, 30-day expiry.
- You can send only to verified numbers, up to 5.
- "**Pre-defined content**: You must use Twilio-provided templates. Custom message bodies… aren't available during trial."
- Trial numbers are assigned, not chosen.
- The API accepts only template bodies such as `sms_2fa`. Inbound webhook replies cannot use direct TwiML. https://www.twilio.com/docs/usage/trials/try-out-sms.md
- Trial messages begin "Sent from a Twilio trial account", and trial toll-free numbers cannot send until verified. https://www.twilio.com/en-us/signup-credits
- Whether a trial number can receive MMS: **UNVERIFIED**.

**Number cost and MMS support.** A long code costs $1.15/mo and a toll-free number $2.15/mo. The pricing table lists **inbound MMS prices for both long codes ($0.0165) and toll-free ($0.02)**, so both support inbound MMS. https://www.twilio.com/en-us/sms/pricing/us . US toll-free numbers send and receive MMS by default. https://www.twilio.com/en-us/blog/products/launches/mms-on-toll-free-numbers-is-generally-available

**Registration gates every path that sends to US phones.**
- **Local numbers (10DLC).** Twilio blocks messages to US numbers sent from an unregistered 10DLC number (error 30034). https://www.twilio.com/docs/api/errors/30034
  - A2P 10DLC registration requires a paid account. Link as above.
  - Sole-proprietor campaign vetting "might take several weeks". https://www.twilio.com/docs/messaging/compliance/a2p-10dlc/direct-sole-proprietor-registration-overview
- **Toll-free numbers.** They "must be verified before" messaging US recipients, and Twilio reviews verification requests "within three business days". https://www.twilio.com/docs/messaging/compliance/toll-free/api-onboarding
- **Verdict:** no Twilio SMS path delivers custom replies to US phones within 4 hours.

**Webhook media.** Each inbound message has `NumMedia`, plus `MediaUrl{N}` and `MediaContentType{N}`, numbered from zero (`MediaUrl0`). https://www.twilio.com/docs/messaging/guides/webhook-request
- The Media resource page says "Twilio enforces HTTP Basic Authentication for all media URLs". You authenticate with an API key SID and secret. https://www.twilio.com/docs/messaging/api/media-resource
- The security page calls media authentication an opt-in account setting. https://www.twilio.com/docs/usage/security
- The pages conflict; always send auth.

**Retention.**
- Media is kept "until you delete the related Media subresource". You can delete it with `DELETE …/Messages/{MessageSid}/Media/{Sid}.json`. https://www.twilio.com/docs/messaging/api/media-resource
- Message bodies can be redacted by POSTing `Body=""`, and messages can be deleted. Creating a message also accepts a `contentRetention` parameter set to `retain` or `discard`. https://www.twilio.com/docs/messaging/api/message-resource
- Default log visibility is 400 days, and media older than 13 months is deleted (Help Center, not fetched directly, **UNVERIFIED**). https://support.twilio.com/hc/en-us/articles/223181008
- Under Message Redaction, inbound media is deleted after 24h (**UNVERIFIED**, search snippet only). https://www.twilio.com/docs/messaging/guides/privacy-message-redaction

## 3. Twilio MCP

There are two different servers:
- **Official hosted docs MCP (Public Beta).** It has two tools, `twilio__search` and `twilio__retrieve`.
  - **Read-only** ("does not execute API calls"); no keys.
  - Add it to Claude Code with `claude mcp add --transport http twilio-docs https://mcp.twilio.com/docs`. https://www.twilio.com/docs/mcp
  - Executing tools are "planned". Same URL.
- **`@twilio-alpha/mcp` v0.7.0** (published 2026-07-22). It is a "Proof of Concept" from Twilio's ETI team (repo twilio-labs/mcp).
  - Wraps OpenAPI specs as executable tools: buy numbers, set webhooks, send messages, read logs.
  - Scope with `--services`/`--tags`.
  - It takes credentials as a positional argument: `npx -y @twilio-alpha/mcp ACCOUNT_SID/API_KEY:API_SECRET`. https://registry.npmjs.org/@twilio-alpha/mcp
  - Claude Code shape (inferred from that README): `claude mcp add twilio -- npx -y @twilio-alpha/mcp "$SID/$KEY:$SECRET" --tags Api20100401IncomingPhoneNumber,Api20100401Message`
- **Caveats for the alpha server:**
  - Secret sits in process args and config; prompt injection could spend money or send texts.
  - Twilio advises against running community MCP servers alongside it.

## 4. Non-iPhone alternatives

- **Telegram bot.** Create it with @BotFather in minutes.
  - Photos arrive as `photo: Array of PhotoSize`. `getFile` returns a download link that is valid for at least 1 hour, for files up to 20MB. https://core.telegram.org/bots/api
  - Bot chats are cloud chats with "server-client encryption" only, so **Telegram can read them**. https://telegram.org/faq
  - No registration; iOS and Android.
- **Twilio WhatsApp sandbox.** Uses the shared number +14155238886.
  - Each tester sends `join <code>`. The session expires 3 days after joining.
  - Users who are not joined get error 63015.
  - Legacy Console only; billed at standard rates.
  - Free-form media replies are allowed within the 24h window. https://www.twilio.com/docs/whatsapp/sandbox
  - Media arrives in the same `MediaUrl0` webhook format.
  - **Twilio processes plaintext**, and so do Meta and the Cloud API host (**UNVERIFIED** detail).
