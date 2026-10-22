# Agent prompt: cloud side (@cloudhoppr)

You are building the cloud side of Cardmax, a privacy-first credit card optimizer, for a four-hour hackathon on the personal agents and data privacy track. A teammate's agent is building the browser extension and the recommendation engine in parallel.

Read these first:
- `docs/DECISIONS.md` covers the product, privacy rules, and what is cut.
- `docs/WORK_SPLIT.md` covers ownership, merge rules, and the timeline.
- `packages/core/src/schema.ts` is the shared contract. Import from `@cardmax/core` and do not edit it. Ask the human for changes.
- `docs/research/02-photon-product-apis.md` covers the Photon and retailer API details.
- The "What's new" section at the top of `docs/WORK_SPLIT.md` lists what's already built and what changed. Start there.
- Design UI changes in the Paper file "Cardmax" first, then build them. The landing page and dashboard designs are on the artboard "Landing — product".

## You own

`apps/web/` (TanStack Start), `packages/api/` (oRPC), `packages/auth/` (Better Auth), `packages/db/` (Drizzle with Postgres on Neon), a new `packages/agent/`, and the root config files. Do not edit `apps/extension/` or `packages/core/`.

## Build, in order

1. **Review PR #4.** It builds the landing page in `apps/web/src/components/landing/` and the `/` route. Review and merge it rather than rebuilding it. Reuse its tokens (`landing.css`) for any new page.
2. **Infrastructure.** A Neon database already exists. Get `DATABASE_URL` from Matt, or claim your own, then run `bun run db:push`. Confirm email and password sign-in works, and deploy (Vercel is fine). Add every new secret to the matching `.env.schema` file. Never commit `.env`.
3. **Wallet sync.** Add a `wallet` table: one row per user, holding a `WalletCard[]` JSON value and an updated timestamp. Nothing else. Add protected oRPC procedures `wallet.get` and `wallet.put`, validated with `walletCard` from core. Require an explicit opt-in checkbox at sign-up that says the server can read the wallet (card names only). Account deletion must delete the wallet row.
4. **Sync page.** The web app talks to the extension with `chrome.runtime.sendMessage(EXTENSION_ID, message)` using `ExtensionMessage` from core. Only the web app can start this exchange. The extension already handles `cardmax:getWallet` and `cardmax:setWallet`, and allows the origin in `WXT_WEB_ORIGIN`.
5. **Listing search.** Add an oRPC procedure `listings.search` that takes a `ListingQuery` and returns `Listing[]`. The extension calls it with oRPC's `RPCLink` at `${WXT_API_URL}/api/rpc` (see `apps/extension/lib/api.ts`). Query Best Buy first (search by UPC, then by title). Add Walmart's affiliate API if approval arrives in time; otherwise ship Best Buy only. Keep the API keys server-side. Do not log or store queries. Allow CORS from the `chrome-extension://` origin. Add basic rate limiting.
6. **Platform screens.** Build them from the Paper page "Platform": sign up with the wallet-sync consent, onboarding (add cards, connect the extension, link a phone), `/wallet`, `/texts` (text agent settings), `/privacy` (what the server holds, export, delete account), and `/plan`.
7. **Text agent on Twilio** in `packages/agent/`, behind the `Channel` adapter described in `docs/WORK_SPLIT.md`. Read `docs/research/03-texting-channels.md` first. A trial account can't send custom replies, and US delivery needs toll-free verification (about 3 business days) or A2P 10DLC (weeks), so start verification right away. Verify `X-Twilio-Signature` on every webhook.
   - Phone linking: the web app shows a one-time code, and the user texts it to the bot.
   - The first reply says that Twilio and carriers can read texts.
   - For "which card for <merchant>", call `guessMerchant()` and `recommend()` from core with the user's synced wallet.
   - Verify the provider's request signature on every webhook.
   - Never ask for or store amounts or card digits. Keep no message log beyond the current request.
   - Phrase replies as rewards math, never advice.
8. **Storefront photos.** When a text carries an image, download it with the provider's auth, strip EXIF metadata (GPS especially), and ask Claude Haiku 5.5 (`claude-haiku-5-5`) for `{ name, domain, confidence }` with structured output. Then run `guessMerchant()` and `recommend()`. Say which store you saw and how sure you are, and ask for the store name when you're unsure. Never write the image to disk, the database, or logs. Delete the media from the provider after replying. Details are in `docs/DECISIONS.md` under "Storefront photos".
9. **`/privacy` transparency page.** List every send: the `ListingQuery` contents, what the synced wallet holds, what the text provider can see, and that photos go to Anthropic for one request.

## Constraints

- Store no transactions, amounts, merchants, or browsing data. The only personal data on the server is the account, the wallet (issuer and product only), and the linked phone number.
- Add dependencies only inside your own workspace. If `bun.lock` conflicts, run `bun install` instead of hand-merging.
- Follow the existing code style, and run `bun run check` and `bun run check-types` before each commit.
- Use small commits on `b/<topic>` branches.

## Done when

All of these work on the deployed app: sign up with consent, sync the wallet from the extension, call `listings.search` from the extension, see the wallet at `/wallet`, text the bot the link code, get a card recommendation by texting a store name, and get one by texting a storefront photo.
