# Twilio setup

The SMS/MMS webhook is `apps/web/src/routes/api/agent/twilio.ts`. It returns 404 until both Twilio variables are set.

## Env vars

Set these in `apps/web/.env` locally and in Vercel (Project → Settings → Environment Variables):

| Var | Value |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | `AC…` from the Twilio Console home page |
| `TWILIO_AUTH_TOKEN` | Auth token from the same page. Mark it Sensitive in Vercel. |
| `BETTER_AUTH_URL` | The public site URL, with no trailing path. Signatures are checked against `${BETTER_AUTH_URL}/api/agent/twilio`. |
| `ANTHROPIC_API_KEY` | Optional. Without it, photos get "text the name". |

`BETTER_AUTH_URL` is `@public`, so it is inlined at build time. Redeploy after changing it.

## Point the number at the webhook

Twilio Console → Phone Numbers → Active numbers → your number → Messaging configuration:

- **A message comes in:** Webhook, `https://<prod>/api/agent/twilio`, **HTTP POST**.

The URL must match `BETTER_AUTH_URL` exactly, including the scheme and any port, or every request gets a 403.

## Local testing

1. `cloudflared tunnel --url http://localhost:3001` and copy the `https://….trycloudflare.com` URL.
2. Set `BETTER_AUTH_URL` to that URL, then start `bun run dev:web`. Restart dev whenever the tunnel URL changes.
3. Vite blocks unknown hosts in dev. Allow the tunnel with `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.trycloudflare.com bun run dev:web`.
4. Set the number's webhook to `https://<tunnel>/api/agent/twilio`, HTTP POST.

For tests that don't need Twilio, use `/api/agent/dev` instead (see `.env.schema`).

## Constraints (from `docs/research/03-texting-channels.md`)

- **Trial accounts can't run the bot.** Trial replies must use Twilio templates, so custom TwiML replies don't send. Trial accounts can only text up to 5 verified numbers, and messages start with "Sent from a Twilio trial account". Upgrade to a paid account first.
- **US delivery needs verification.**
  - A toll-free number must pass toll-free verification before it can text US phones. Twilio reviews requests within about 3 business days.
  - A local 10DLC number needs A2P 10DLC registration (paid account only). Sole-proprietor vetting can take weeks. Unregistered traffic fails with error 30034.
  - Toll-free is the faster path. Both number types receive MMS.
- **Privacy.** Twilio and the carriers see every message in plaintext. The route deletes inbound media from Twilio after replying. Message bodies stay in Twilio's logs unless they are redacted separately.
