# Pointmaxx

**The right card at every checkout, picked on your device.** [pointmaxx.ing](https://pointmaxx.ing)

Pointmaxx is a personal agent for credit card rewards. It looks at the store you're about to pay, checks the cards you carry, and tells you which one earns the most. It works in three places: a Chrome extension at checkout, a text agent you can message from a store, and a web wallet. It never asks for a card number, never reads your purchase history, and sends nothing off your device without asking first.

## Inspiration

Most of us carry more than one card. Experian puts the average at **3.7 active credit cards per person, out of 7.1 open** ([Bankrate, citing Experian](https://www.bankrate.com/credit-cards/news/credit-card-ownership-usage-statistics/)). Americans put **$3.6 trillion** on consumer credit cards in 2024 ([CFPB, Dec 2025](https://bankingjournal.aba.com/2026/01/cfpb-issues-report-on-credit-card-market/)). Cash-back cards are now the most common kind of general-purpose account. So the rewards are real money. The trouble is that almost nobody can keep track of which card earns what, where.

The part that surprised us is that **a card's bonus depends on how the store codes the charge, not on what you're buying.** A TV bought at Costco earns the warehouse-club rate, not an electronics rate. Amex and Chase both leave Target, Walmart, and warehouse clubs out of their grocery bonuses. If you check out through Shopify, Stripe, or PayPal, the charge can carry the platform's code instead of the store's. "Use the grocery card for groceries" is the wrong mental model.

The tools that automate this usually want something in return: a bank login through an aggregator, card numbers, or your transaction history. Meanwhile **73% of Americans say they have little or no control over what companies do with their data, and 67% say they understand little to nothing about it** ([Pew Research Center, 2023](https://www.pewresearch.org/internet/2023/10/18/how-americans-view-data-privacy/)). We wanted to see how far we could get by doing the opposite: keep the reasoning on the device, ask for the least data possible, and make every outbound request visible before it happens.

Online shopping is where this decision happens most often. US e-commerce reached **$1.23 trillion in 2025, 16.4% of all retail** ([US Census Bureau, Q4 2025 report](https://www.census.gov/retail/ecommerce.html)). Every one of those checkouts is a chance to pick the right card or the wrong one.

## What it does

**For a specific user.** Someone with two to four rewards cards who shops online and in stores, and doesn't want to link a bank account to get help choosing.

1. **At checkout, in Chrome.** Open the popup on any store page. Pointmaxx reads the domain, price, and product from the tab, guesses the store's category, shows how confident it is, and ranks your cards with the reason: "2% back on everything", "4x points on dining". You can override the category in one click, and the fix is remembered for that store on your device.
2. **Automatic suggestions, per site.** Turn on "Automatic on this site" and Chrome asks you to grant that one site. On cart and checkout pages there, the toolbar badge shows the best rate, for example `2%`. It adds nothing to the store's page and sends nothing.
3. **Compare prices, with consent.** Click Compare and the popup shows the exact object it's about to send, such as `{ "upc": "027242925694" }`. Press Send and our server asks the Best Buy Products API for the same item. Results are ranked by **net price**: the price minus the reward your best card would earn at that store.
4. **Text it from a store.** Link your phone with a 6-digit code from the web app. Then text a store name ("which card for Whole Foods") or a photo of the shopfront. It replies with the card from your synced wallet and the reason, over SMS through Twilio, so it works on any phone.
5. **A web wallet you control.** Pick your cards once by issuer and product name. Wallet sync is off until you opt in at sign-up. The web app shows exactly what the server holds.

## How we built it

### Architecture

| Layer | What it does | Built with |
| --- | --- | --- |
| Extension (device) | Reads the tab, guesses the merchant, ranks cards, shows the payload panel | WXT, React, Chrome MV3, TypeScript |
| Core engine | `guessMerchant()`, `recommend()`, `rankListings()`, the card catalog | `packages/core`, pure TypeScript, no network |
| Web and API | Accounts, wallet sync, phone linking, `listings.search` | TanStack Start, oRPC, Better Auth, Tailwind, shadcn/ui |
| Data | Synced wallet (card names only), catalog, link codes | Drizzle, Postgres on Neon |
| Agent | Twilio webhook, link codes, store parsing, photo reading | `packages/agent`, Twilio, Claude Haiku 5.5 |
| Tooling | Monorepo, lint, tests, deploy | Bun, Turborepo, Biome, Playwright, Vercel |

### The recommendation math

Each card $c$ has a base multiplier $b_c$ and a list of earn rules. A rule $r$ has a multiplier $k_r$, a category or merchant list it applies to, store exclusions, and sometimes an annual cap. For a merchant guess $m$ and an amount $A$, the card's multiplier is the best rule that applies, never below the base rate:

$$
k_c(m) = \max\Big(b_c,\ \max_{r \in R_c,\ r \text{ applies to } m} k_r\Big)
$$

Points are converted to dollars with a value per point $v_c$. Cash back is exactly 1 cent per percent. For points, we default to a conservative 1 cent and label that assumption in the UI, because transferable points are often worth more and the user should decide:

$$
\text{reward}_c(m, A) = \frac{A \cdot k_c(m) \cdot v_c}{100}, \qquad c^{*} = \arg\max_{c \in \text{wallet}} \text{reward}_c(m, A)
$$

On the $1,199.99 TV in our demo, that's the difference between the right card and the second-best one:

$$
\underbrace{1199.99 \times 0.02}_{\text{Citi Double Cash}} = \$24.00 \qquad \text{vs.} \qquad \underbrace{1199.99 \times 0.015}_{\text{Chase Freedom Unlimited}} = \$18.00
$$

Compare ranks other stores' listings $\ell$ by net price, so a cheaper sticker price at a store where your cards earn less doesn't automatically win:

$$
\text{net}(\ell) = p_\ell - \max_{c} \text{reward}_c(m_\ell, p_\ell)
$$

### Guessing the merchant

There's no public dataset that maps a website to the merchant category code a card network will see. So `guessMerchant()` works in layers, and every guess carries a confidence level the user can see and override:

1. A curated map of **115 store domains**, limited to merchants whose category is unambiguous.
2. Page signals such as schema.org data and checkout platforms. Third-party checkouts drop to low confidence and say so: "Checkout by Shopify · low confidence, check the category."
3. The user's own override, which wins from then on.

### The agent

The text agent is a small pipeline behind a channel interface, so the messaging provider is one file:

```ts
export interface Channel {
  parse(request: Request): Promise<Inbound | null>; // verify the Twilio signature, then normalize
  reply(to: string, text: string): Promise<void>;
  deleteMedia?(inbound: Inbound): Promise<void>;     // remove the photo after replying
}
```

A text goes through `parse`, then phone linking or store matching, then `recommend()` over the synced wallet, then `reply`. Typed store names are matched by code against the curated map. A photo takes one extra step: the server strips EXIF metadata, including GPS, then sends the image alone to **Claude Haiku 5.5** with a fixed system prompt and structured output:

```ts
const storeGuess = z.object({
  name: z.string().nullable(),
  domain: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});
```

The prompt asks only for the store's identity and tells the model to ignore people, faces, plates, and other text. If no store is clear, it returns `null` and the bot asks for the name instead of guessing. The model never sees the phone number, the wallet, other messages, or the card we end up picking.

### Testing that nothing leaks

Privacy claims are easy to make and hard to keep, so we test them. The extension has **26 Playwright browser tests** that load real store fixtures and fail if any request leaves the device without a matching user action. One test enforces the exact shape of the Compare request. The engine, API, and agent have **96 unit tests**, including EXIF stripping, Twilio signature checks, and the link-code flow. CI runs both on every pull request.

## Why the agent model and the privacy design hold up

A personal agent is only worth trusting if it does useful work while seeing as little as possible. We built Pointmaxx around four rules.

**1. Deterministic tools, one narrow model call.** The decisions that touch money, which card and how much it earns, are plain code that runs the same way every time and can be tested. The language model is used for perception only: turning a photo into a store name. That keeps answers explainable ("2% back on everything") and keeps the model away from anything personal.

**2. Least data, by construction.** The wallet stores issuer and product names, never card numbers or last four digits. The card catalog downloads to the device, and matching happens locally, so data flows down, not up. Amounts, merchants, pages, and overrides never sync.

**3. Consent at every outbound step.** Each thing that can leave the device has its own visible gate:

| What could leave | The consent control |
| --- | --- |
| A product lookup | The payload panel shows the exact `ListingQuery`; nothing sends until you press Send |
| Automatic suggestions on a site | Chrome's own permission prompt, one origin at a time, from your click |
| Your wallet | Off until you opt in at sign-up (`walletSyncConsent` defaults to `false`) |
| Your phone number | Only linked when you text a 6-digit code you got from the web app; `UNLINK` disconnects |
| A storefront photo | Only sent if you choose to text one; EXIF and GPS are stripped first |

**4. Honest about what isn't private.** SMS is not end-to-end encrypted. Twilio and the carriers can read texts, and the bot's first reply says so. The photo goes to Anthropic's API for one request, under API terms that don't allow training on it. The server keeps no message log beyond the current request. We'd rather show users the real tradeoff than claim a guarantee we can't keep.

This is why the agent fits the **Personal Agents & Data Privacy** track: it acts for you in two contexts, online and in a store, and each piece of personal data has one stated purpose and a control in front of it.

## Public data, and its limits

| Source | What it powers | Limit we design around |
| --- | --- | --- |
| Issuer benefit pages | Earn rules for 8 cards, each with `sourceUrl` and `checkedOn` | No open dataset of category multipliers exists. The CFPB card survey covers fees and APRs but not category rates, so we curate and date every rule. |
| schema.org `Product` data on the page | Title, price, and UPC from the tab | Some stores publish no GTIN; Compare falls back to title search |
| Best Buy Products API | Live price for the same UPC | Results may only be cached temporarily |
| Walmart Affiliate API | A second price source | Needs affiliate approval, which is still pending |
| Merchant category codes | The categories our store map predicts | No public domain-to-MCC data; Visa and Mastercard can assign different codes; marketplaces code as the platform |

Amazon's product API now requires 10 qualifying affiliate sales in 30 days, so Amazon isn't in Compare. Each limit is visible to the user as a confidence label, a fallback, or a missing store, not hidden behind a confident-looking answer.

## Challenges we ran into

- **The category is a guess, and the issuer has the last word.** Card networks, not stores, decide the code at charge time, and issuers add their own exclusions on top. We stopped trying to be certain and started showing confidence and making overrides one click.
- **No data to start from.** We expected a public dataset of category rates and found none, so we built a small, sourced catalog by hand. Every rule has a URL and a date so it can be checked and updated.
- **Automatic detection without broad permissions.** `activeTab` only works after a click, so it can't notice a checkout page by itself. Asking for access to every site at install was not acceptable. We used optional host permissions, requested one origin at a time from a user gesture.
- **Proving "nothing leaves the device."** We wrote browser tests that watch every request against real store fixtures, so a privacy regression fails CI instead of shipping.
- **SMS is plaintext.** Twilio gives us reach on any phone, but carriers and Twilio can read messages. We made the bot say that up front and kept anything sensitive out of the conversation.
- **Texting real users takes paperwork.** US A2P 10DLC registration or toll-free verification is required even for a small bot.

## What we learned

- The merchant, not the product, decides the reward. That one fact shaped the whole engine.
- A personal agent earns trust by narrowing what the model sees, not by adding more context.
- Consent works best as a moment in the interface, like the payload panel, rather than a paragraph in a policy.
- Tests can enforce privacy promises the same way they enforce correctness.

## What's next

- **Smarter picks:** model issuer exclusions per card, track rotating quarterly categories and their activation, and let users set their own point values.
- **Beyond the card:** factor in card-level purchase protections, keep a private price history in the browser, and show whether each annual fee is paying for itself.
- **More private reach:** a local MCP server so your own assistant can ask Pointmaxx with no messaging provider in between, on-device page understanding once Chrome's built-in model runs on typical laptops, and an open, sourced card catalog.

## Built with

TypeScript · WXT · React · Chrome MV3 · TanStack Start · oRPC · Better Auth · Tailwind · shadcn/ui · Drizzle · PostgreSQL · Neon · Twilio · Claude Haiku 5.5 · Bun · Turborepo · Biome · Playwright · Vercel

## Sources

- CFPB, *The Consumer Credit Card Market* (Dec 2025), via [ABA Banking Journal](https://bankingjournal.aba.com/2026/01/cfpb-issues-report-on-credit-card-market/): $3.6 trillion purchase volume in 2024; cash back cards are the leading share of general-purpose accounts.
- [Bankrate, credit card ownership statistics](https://www.bankrate.com/credit-cards/news/credit-card-ownership-usage-statistics/), citing Experian: 3.7 active cards, 7.1 open.
- [US Census Bureau, quarterly e-commerce report](https://www.census.gov/retail/ecommerce.html): $1,233.7 billion in 2025, 16.4% of retail (Q4 2025 release, March 2026).
- [Pew Research Center, *How Americans View Data Privacy*](https://www.pewresearch.org/internet/2023/10/18/how-americans-view-data-privacy/) (Oct 2023): 73% little or no control over company data use; 67% understand little to nothing.
- [American Express, retail and supermarket definitions](https://www.americanexpress.com/us/rewards-info/retail.html): superstores, convenience stores, and warehouse clubs are not supermarkets.
- [CFPB, Terms of Credit Card Plans survey](https://www.consumerfinance.gov/data-research/credit-card-data/terms-credit-card-plans-survey/): fees and APRs, no structured category rates.
