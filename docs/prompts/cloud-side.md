# Agent prompt: cloud side (@cloudhoppr)

You are building the cloud side of Cardmax, a privacy-first credit card optimizer, for a four-hour hackathon on the personal agents and data privacy track. A teammate's agent is building the browser extension and the recommendation engine in parallel.

Read these first:
- `docs/DECISIONS.md` covers the product, privacy rules, and what is cut.
- `docs/WORK_SPLIT.md` covers ownership, merge rules, and the timeline.
- `packages/core/src/schema.ts` is the shared contract. Import from `@cardmax/core` and do not edit it. Ask the human for changes.
- `docs/research/02-photon-product-apis.md` covers the Photon and retailer API details.

## You own

`apps/web/` (TanStack Start), `packages/api/` (oRPC), `packages/auth/` (Better Auth), `packages/db/` (Drizzle with Postgres on Neon), a new `packages/agent/`, and the root config files. Do not edit `apps/extension/` or `packages/core/`.

## Build, in order

1. **Infrastructure.** Set up the Neon database with `DATABASE_URL` in `apps/web/.env`, run `bun run db:push`, confirm email and password sign-in works, and deploy (Vercel is fine). Add every new secret to the matching `.env.schema` file. Never commit `.env`.
2. **Wallet sync.** Add a `wallet` table: one row per user, holding a `WalletCard[]` JSON value and an updated timestamp. Nothing else. Add protected oRPC procedures `wallet.get` and `wallet.put`, validated with `walletCard` from core. Require an explicit opt-in checkbox at sign-up that says the server can read the wallet (issuer and product only). Account deletion must delete the wallet row.
3. **Sync page.** The web app talks to the extension with `chrome.runtime.sendMessage(EXTENSION_ID, message)` using `ExtensionMessage` from core. Only the web app can start this exchange. Build a page that pulls the wallet from the extension and pushes it to the server, and the reverse.
4. **Listing search.** Add an oRPC procedure `listings.search` that takes a `ListingQuery` and returns `Listing[]`. Query Best Buy first (search by UPC, then by title). Add Walmart's affiliate API if approval arrives in time; otherwise ship Best Buy only. Keep the API keys server-side. Do not log or store queries. Allow CORS from the extension origin. Add basic rate limiting.
5. **Text agent.** Build `packages/agent/` with the Photon Spectrum SDK (`spectrum-ts`) on the free tier.
   - Phone linking: the web app shows a one-time code, and the user texts it to the bot.
   - The first reply says that Photon and carriers can read texts.
   - For "which card for <merchant>", call `recommend()` from core with the user's synced wallet.
   - Never ask for or store amounts or card digits. Keep no message log beyond the current request.
   - Phrase replies as rewards math, never advice. Photon's terms ban automated financial advice.
6. **Public pages.** Build a landing page and a "what leaves your device" transparency page. The transparency page lists every send: the `ListingQuery` contents, what the synced wallet holds, and what Photon can see.

## Constraints

- Store no transactions, amounts, merchants, or browsing data. The only personal data on the server is the account, the wallet (issuer and product only), and the linked phone number.
- Add dependencies only inside your own workspace. If `bun.lock` conflicts, run `bun install` instead of hand-merging.
- Follow the existing code style, and run `bun run check` and `bun run check-types` before each commit.
- Use small commits on `b/<topic>` branches.

## Done when

All of these work on the deployed app: sign up with consent, sync the wallet from the extension, call `listings.search` from the extension, text the bot the link code, and get a card recommendation for a merchant by text.
