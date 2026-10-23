# Pointmaxx

**The right card at every checkout, picked on your device.** Live at [pointmaxx.ing](https://pointmaxx.ing).

Pointmaxx is a personal agent for credit card rewards. It looks at the store you're about to pay, checks the cards you carry, and tells you which one earns the most. It never asks for a card number, never reads your purchase history, and sends nothing off your device without asking first.

- **Chrome extension.** Open the popup at checkout to see your best card, the reason ("2% back on everything"), and how sure it is about the store's category. Turn on automatic suggestions for one site at a time, and the toolbar badge shows the best rate on cart and checkout pages.
- **Compare prices, with consent.** The popup shows the exact object it's about to send, such as `{ "upc": "027242925694" }`. Nothing leaves until you press Send. Results are ranked by price minus the reward your best card earns at each store.
- **Text agent.** Text a store name or a photo of the shopfront to the Twilio number and get the card back over SMS, so it works on any phone.
- **Web wallet.** Pick your cards by issuer and product name. Wallet sync is off until you opt in.

Read the full project story in [docs/pitch/about.md](docs/pitch/about.md), and the live demo script in [docs/pitch/demo-script.md](docs/pitch/demo-script.md).

## Why it's built this way

A card's bonus depends on how the **store** codes the charge, not on what you're buying. A TV at Costco earns the warehouse-club rate, and Shopify checkouts can code as the platform. So the hard problem is guessing the merchant category and being honest about how sure you are.

The engine is plain code. For a merchant guess $m$ and amount $A$, each card's multiplier is the best earn rule that applies, never below its base rate, and the pick is the card with the largest reward:

$$
k_c(m) = \max\Big(b_c,\ \max_{r \in R_c,\ r \text{ applies to } m} k_r\Big), \qquad c^{*} = \arg\max_{c} \frac{A \cdot k_c(m) \cdot v_c}{100}
$$

Points default to $v_c = 1$ cent, and the UI labels that assumption.

## Privacy model

| What could leave the device | The control in front of it |
| --- | --- |
| A product lookup | The payload panel shows the exact `ListingQuery`; nothing sends until you press Send |
| Automatic suggestions on a site | Chrome's permission prompt, one origin at a time, from a click |
| Your wallet (card names only) | Off until you opt in at sign-up |
| Your phone number | Linked only when you text a 6-digit code from the web app; `UNLINK` disconnects |
| A storefront photo | Only if you text one; EXIF and GPS are stripped before anything else |

- `recommend()` runs on the device and makes no network calls.
- The only AI call reads a storefront photo. Claude Haiku 5.5 gets the image and a fixed prompt, and returns `{ name, domain, confidence }`. It never sees your number, wallet, or other messages. Card selection happens afterward in code.
- SMS isn't end-to-end encrypted. Twilio and carriers can read texts, and the bot's first reply says so.
- Playwright tests fail CI if any request leaves the extension without a matching user action.

## Public data, and its limits

| Source | What it powers | Limit |
| --- | --- | --- |
| Issuer benefit pages | Earn rules for 8 cards, each with `sourceUrl` and `checkedOn` | No open dataset of category rates exists; the CFPB card survey has fees only |
| schema.org `Product` data | Title, price, and UPC from the tab | Some stores publish no UPC; Compare falls back to the title |
| Best Buy Products API | Live price for the same UPC | Results may only be cached briefly |
| Walmart Affiliate API | A second price source | Waiting on affiliate approval |
| Merchant category codes | The categories the 115-domain store map predicts | No public domain-to-MCC data, so every guess shows its confidence |

## Repository layout

```
apps/
  extension/   Chrome extension (WXT, React, MV3)
  web/         Web app and API host (TanStack Start), including the Twilio webhook
packages/
  core/        Shared contract and engine: guessMerchant(), recommend(), rankListings(), catalog
  agent/       Text agent: channel adapter, Twilio, link codes, store parsing, photo reading
  api/         oRPC routers: wallet, device, phone, listings
  auth/        Better Auth configuration
  db/          Drizzle schema, migrations, catalog seed
  ui/          Shared shadcn/ui components
  config/      Shared TypeScript config
docs/          Decisions, research, work split, pitch materials
```

## Getting started

```bash
bun install
```

### Web app and API

1. Copy the variables in `apps/web/.env.schema` into `apps/web/.env` and fill them in. You need at least `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`. Add `BESTBUY_API_KEY` for Compare, `ANTHROPIC_API_KEY` for photo reading, and the `TWILIO_*` values for the text agent.
2. Apply the schema and seed the card catalog:

   ```bash
   bun run db:push
   bun run db:seed
   ```

3. Start everything:

   ```bash
   bun run dev
   ```

   The web app runs at [http://localhost:3001](http://localhost:3001).

### Extension

```bash
cd apps/extension
bun run dev        # opens Chrome with the extension loaded
bun run build      # production build in .output/
bun run zip        # packaged zip for the Chrome Web Store
```

## Checks and tests

```bash
bun run check          # Biome lint and format
bun run check-types    # TypeScript across the monorepo
bun run test           # unit tests for core, api, and agent
cd apps/extension && bun run test:e2e   # Playwright browser tests, including the privacy checks
```

## Environment notes

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during install; run `bun run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform. Bun's automatic env loading is disabled in `bunfig.toml`.

After changing Better Auth plugins or schema options, run `bun run auth:generate` from the root, review the changes, then migrate.

## Built with

TypeScript · WXT · React · TanStack Start · oRPC · Better Auth · Tailwind · shadcn/ui · Drizzle · PostgreSQL on Neon · Twilio · Claude Haiku 5.5 · Bun · Turborepo · Biome · Playwright · Vercel
