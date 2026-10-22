# Decisions

These came out of a design review on 2026-10-22. Background research and sources are in `docs/research/`.

## Product

- **Track:** Personal agents and data privacy.
- **One job:** pick the best card for this merchant and amount, privately. Also show alternative listings of the same product at other merchants, ranked by net price (price minus the reward from the user's best card at that merchant).
- **Cut from the MVP:** dark-pattern detection, price-discrimination checks, price history, the receipt vault, return and price-protection reminders, the values layer, annual fee tallies, and the gift agent.

## Recommendation engine

- Card bonuses depend on how the **merchant** codes the charge, not on what the product is. A TV at Costco earns the warehouse-club rate.
- The merchant category is a guess. Make the guess in this order: a curated map of about 30 domains, then a page heuristic, then a user override. Always show the guess with its confidence and let the user correct it.
- There is no on-device language model in the MVP. Chrome's built-in AI needs 22 GB of disk and a strong GPU, which is too risky for a demo.
- Card earn rates are curated by hand in `packages/core`. Every card needs a `sourceUrl` and a `checkedOn` date. The CFPB survey data has annual fees but no category rates. CardPin (MIT) is a starting point.
- A point is worth 1 cent by default. This is a conservative assumption, so label it in the UI. Transferable currencies are often worth more.
- `recommend()` runs on the device and never makes network calls.

## Data and privacy

- **The wallet holds issuer and product only.** No card numbers, no last four digits, no free text.
- **Data flows down, not up.** The card catalog downloads to the device, and matching happens locally.
- **Only one personal send:** the alternative-listing lookup. It sends only a `ListingQuery` (a UPC, or a product title as a fallback) after the user clicks. The payload panel shows the exact object before it goes. Retailer API keys live on the server, so the query goes to our API, which calls Best Buy and Walmart.
- **Accounts sync the wallet only.** The synced wallet is server-readable, so the text agent can use it. Users opt in explicitly at sign-up. Transactions, amounts, merchants, and overrides never sync.
- **Revocation:** one control stops all sends and deletes the local wallet. Account deletion removes the synced wallet.
- **Extension permissions:** `activeTab` and `storage`. Request site access per site at runtime with `chrome.permissions.request` from a user click. Never request all-sites access at install.

## Text agent

- The text agent uses Photon (Spectrum SDK) on the free tier, which allows up to 10 users on a shared number. The user texts first.
- Photon can read every message in plaintext. So can carriers on SMS fallback. The first reply says so.
- The bot never asks for amounts or card digits, and it never stores them.
- The server keeps no message log beyond the current request.
- Replies are rewards math, never financial advice. Photon's terms require this.
- **Phone linking:** the web app shows a one-time code, and the user texts it to the bot.
- **Why Photon over Twilio:** Twilio SMS is also plaintext, both to Twilio and to the carriers. It also needs A2P 10DLC or toll-free verification, which takes days to weeks. Photon's iMessage path adds Apple encryption up to Photon's relay. Neither channel is end-to-end encrypted to the bot.

## Product sources

- Best Buy: search by UPC, returns the sale price. The key needs email activation.
- Walmart affiliate API: has a `upc` parameter. Access needs an affiliate account and an uploaded RSA key, and approval time is unknown. If Walmart is not approved in time, ship Best Buy only.
- Amazon is out. The old product API (PA-API 5) is retired, and its replacement (the Creators API) requires 10 qualifying sales in the last 30 days.

## Stack

- Better-T-Stack: TanStack Start, oRPC, Better Auth (email and password), Drizzle, Postgres on Neon, Turborepo, Biome, WXT with React, and bun.
- See `docs/WORK_SPLIT.md` for ownership and the timeline.
