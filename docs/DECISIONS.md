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
- **Automatic on supported stores (decided 2026-10-22):** on any of the curated stores (`supportedStoreDomains` in core, 115 today), the popup switch asks Chrome once for the whole supported list, so the popup then opens at checkout everywhere it's supported. On other sites, the switch asks for that one site. Install still asks for no site access, and all-sites access is never requested.
- **Automatic on this site:** a popup switch asks Chrome for one site at a time. On a granted site, the background watches that tab's URL, including in-page navigations such as Best Buy's move from cart to checkout. At cart-like paths (cart, basket, bag) and checkout-like paths (checkout, payment, Amazon's `/gp/buy/`), it reads the page and sets the toolbar badge, for example "2%", with the card in the tooltip. It opens the popup once per stage per tab. It adds nothing to the store's page and sends nothing. The browser only reports URLs for granted sites. Revoke removes every granted site.
- **Extension permissions:** `activeTab`, `storage`, and `scripting`. `scripting` only runs code in a tab the user granted through `activeTab`, so it adds no host access. Request site access per site at runtime with `chrome.permissions.request` from a user click. Never request all-sites access at install.

## Text agent

- **Channel (changed):** the agent sits behind a channel adapter, so the provider can change without a rewrite. Photon (Spectrum SDK) is iMessage-first, and part of the team uses Android, so Twilio SMS and MMS is being evaluated as the first channel. Twilio's MCP server would let an agent buy the number and set the webhook. The final pick and setup steps will be recorded here.
- Whichever provider is used can read every message and photo in plaintext. So can carriers on SMS. The first reply says so.
- The bot never asks for amounts or card digits, and it never stores them.
- The server keeps no message log beyond the current request.
- Replies are rewards math, never financial advice. Photon's terms require this, and it is the right framing anyway.
- **Phone linking:** the web app shows a one-time code, and the user texts it to the bot.
- **Tradeoff:** Twilio SMS is plaintext to Twilio and the carriers, and texting real US users needs A2P 10DLC or toll-free verification. Photon's iMessage path adds Apple encryption up to Photon's relay, but it doesn't reach Android. Neither channel is end-to-end encrypted to the bot.

## Storefront photos (text agent)

A user can text a photo of a storefront or its logo instead of typing the store name.
- **Flow:** the photo arrives as an MMS or iMessage attachment. The server strips EXIF metadata, especially GPS, before doing anything else. A vision model then names the store and returns `{ name, domain, confidence }`. The domain goes through `guessMerchant()` and `recommend()` like a typed store name.
- **Model:** Claude Haiku 5.5 (`claude-haiku-5-5`) with a fixed prompt and structured output, so replies come back in about a second. The prompt asks only for the store's identity. It ignores people, plates, and anything else in the frame.
- **Reply:** name the store and the confidence, for example "Looks like Target (medium confidence)". Then give the card and the reason. Add "Wrong store? Reply with its name." whenever confidence isn't high.
- **Privacy:**
  - The photo is processed in memory and never written to our database or logs.
  - After the reply, the server deletes the media from the messaging provider wherever the provider's API allows it.
  - The photo goes to Anthropic's API for one request, under its standard API terms, which don't allow training on the data. The transparency page says this plainly.
  - Photos are opt-in by nature: nothing is sent unless the user texts one.
- **Fallback:** if the model can't identify a store, ask for the store name. Never guess a card from a blurry photo.

## Product sources

- Best Buy: search by UPC, returns the sale price. The key needs email activation.
- Walmart affiliate API: has a `upc` parameter. Access needs an affiliate account and an uploaded RSA key, and approval time is unknown. If Walmart is not approved in time, ship Best Buy only.
- Amazon is out. The old product API (PA-API 5) is retired, and its replacement (the Creators API) requires 10 qualifying sales in the last 30 days.

## Stack

- Better-T-Stack: TanStack Start, oRPC, Better Auth (email and password), Drizzle, Postgres on Neon, Turborepo, Biome, WXT with React, and bun.
- See `docs/WORK_SPLIT.md` for ownership and the timeline.
