# Cardmax research (as of 2026-10-22)

## 1. CFPB data

**TCCP survey.** I inspected the newest file (Jul–Dec 2025 data; ~670 rows × 149 columns).
- It has an `Annual Fee` field and full APR and fee fields.
- Rewards data is coarse. A `Rewards` multi-select holds values such as "Cashback rewards; Travel-related rewards; Other rewards". `Other Rewards` is free text, sometimes a pasted list of perks. There are **no structured earn rates or category multipliers.**
- `Services` lists benefits such as "Extension on manufacturer's warranty". I found no "price protection" option.
- Format: XLSX only. Released twice a year with a data dictionary. **No API** (the CFPB is "evaluating" one). No license is named; the page says "Our data is public, and anyone can use it." The CFPB has retired its Explore Cards tool.
- Sources: https://www.consumerfinance.gov/data-research/credit-card-data/terms-credit-card-plans-survey/ , https://files.consumerfinance.gov/f/documents/cfpb_tccp-data_2025-12-31.xlsx , https://files.consumerfinance.gov/f/documents/cfpb_tccp-survey-user-guide_2026-05.pdf (§4.21)

**Credit Card Agreement Database.**
- Collected quarterly. The archive offers ZIP downloads up to Q2-2026. https://www.consumerfinance.gov/credit-cards/agreements/archive/
- The ZIPs hold agreement documents (PDFs); the archive page doesn't name the file type. They are legal text, not structured rewards data, so they are **not usefully machine-readable**. UNVERIFIED: the exact file types inside the ZIPs.

## 2. Other free reward data

- **CardPin**: MIT license, last push 2026-09-10. US `cards.json` and `reward_rules.json` with per-rule `sourceUrl` and `verifiedAt` dates. Data is community-verified and small. https://github.com/strike007-3000/cardpin
- **credit-card-bonuses-api** (Offer Optimist): MIT plus **Commons Clause**, which bars reselling it as a substantial part of a commercial product. 175 cards in JSON/CSV/YAML, synced daily (last push 2026-06-08). It covers sign-up bonuses, annual fees, credits and a `universalCashbackPercent` field, **but not category multipliers**. https://github.com/andenacitelli/credit-card-bonuses-api
- **AwardWallet Credit Card Bonus API** returns category multipliers, but it is a hosted commercial API; terms UNVERIFIED. https://awardwallet.com/api/cc
- Conclusion: no authoritative open dataset of category multipliers exists. Plan to curate our own, with a source URL and date on each rule.

## 3. MCC

- Public MCC lists: greggles/mcc-codes (Unlicense, last updated 2024-08) https://github.com/greggles/mcc-codes . Mastercard's Places API also returns the MCC list. https://developer.mastercard.com/places/documentation/use-cases/merchant-category-code-lookup/
- Merchant-to-MCC lookup: the Visa Merchant Search API and Mastercard merchant APIs exist, but they require developer onboarding. They are not keyed by domain. The public Visa Supplier Locator closed in November 2021. https://milelion.com/2023/11/13/how-to-check-merchant-category-codes-mccs-before-making-a-purchase/ . I found **no public domain-to-MCC dataset.**
- Known prediction problems:
  - Issuer exclusions that go beyond MCC. Amex says "superstores, convenience stores, warehouse clubs" are not supermarkets (Target, Walmart, BJ's). https://www.americanexpress.com/us/rewards-info/retail.html . Chase likewise excludes Walmart, Target and warehouse clubs from grocery bonuses (secondary source).
  - Visa and Mastercard can assign different MCCs to the same merchant (milelion, above).
  - Marketplaces and payment facilitators: the charge carries the platform's MCC (for example 5262 Marketplaces), not the seller's. https://www.pxp.io/mcc-codes/5262-marketplaces
- Verdict: predicting the bonus from a website is a heuristic only. Show confidence levels and let users correct results.

## 4. Price history

- **Keepa API**: paid monthly token-bucket plans, prepaid; tokens expire after 60 minutes. https://keepa.com/api-docs/plans-tokens.html . Price claims vary: about €49/month for 20 tokens/min per RevenueGeeks (UNVERIFIED), and no official free tier. **Redistribution and third-party-app terms are UNVERIFIED.**
- **CamelCamelCamel**: I found no public API (UNVERIFIED).
- **Amazon PA-API 5** is deprecated (US date May 15, 2026), replaced by the **Creators API** (OffersV2). Access is tied to Associates sales. https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation
- Free alternative: log prices locally in the extension as the user browses. Private, but starts with no history.

## 5. Chrome built-in AI

- Status on stable, for **extensions**: Prompt, Summarizer, Translator and Language Detector are stable since Chrome 138. On the **web**, the Prompt API is stable from Chrome 148. Writer, Rewriter and Proofreader are still developer trials. https://developer.chrome.com/docs/ai/built-in-apis
- Requirements: Windows 10/11, macOS 13+, **Linux**, or ChromeOS Chromebook Plus. **22 GB free** on the profile volume. Either a GPU with more than 4 GB VRAM, or a CPU setup with 16 GB RAM and 4+ cores. An unmetered network for the model download. No Android or iOS. https://developer.chrome.com/docs/ai/prompt-api
- No manifest permission is needed. Remove the old `aiLanguageModelOriginTrial` permission. https://developer.chrome.com/docs/extensions/ai/prompt-api

## 6. Purchase protections by issuer

| Issuer          | Price prot.                                                                  | Return prot.                                                        | Ext. warranty                                                                                        |
| --------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Chase           | Removed 2018 (most cards Apr–Jun 2018; Sapphire Reserve ~Aug 2018)           | Removed 2018 on most cards; **Sapphire Reserve has it** ($500/item) | Yes (Sapphire: +1 yr)                                                                                |
| Amex            | Rarely                                                                       | Yes on some cards (Platinum etc., $300/item)                        | Yes (+1 yr, ≤5-yr warranties)                                                                        |
| Citi            | Removed 2019-09-22 (Price Rewind)                                            | Removed 2019-09-22                                                  | Removed from most cards 2019; Costco card 2023-01-22; ThankYou/Strata cards reportedly still have it |
| Capital One     | Listed on some World Elite MC / Visa Sig cards                               | No evidence                                                         | Yes (World Elite MC guide)                                                                           |
| Discover        | Removed 2018-10-31                                                           | Removed Feb 2018                                                    | Removed Feb 2018                                                                                     |
| Wells Fargo     | Visa Signature cards per one 2026 article                                    | UNVERIFIED                                                          | Some cards                                                                                           |
| Bank of America | Ended (secondary source)                                                     | UNVERIFIED                                                          | Some cards (secondary source)                                                                        |
| US Bank         | "Best Value Guarantee" on some Amex-branded US Bank cards (secondary source) | UNVERIFIED                                                          | UNVERIFIED                                                                                           |

Sources:
- Chase: https://awardwallet.com/blog/chase-eliminating-price-return-protection-on-credit-cards , https://www.chase.com/personal/credit-cards/education/basics/how-chase-return-protection-works
- Citi: https://thepointsguy.com/news/citi-removes-travel-shopping-protections/ , https://doctorofcredit.com/?p=200503
- Discover: https://www.nerdwallet.com/blog/credit-cards/discover-will-eliminate-price-protection/
- Mixed and Wells Fargo: https://upgradedpoints.com/credit-cards/credit-card-price-protection-policies/ (updated 2026-09-18)
- Capital One: https://ecm.capitalone.com/WCM/card/world-elite-guide-to-benefits.pdf (a 2019-era revision)
- Amex: https://www.americanexpress.com/content/dam/amex/us/credit-cards/features-benefits/RP_Benefit_Guide_Rev_10-20_10.09.23-final.pdf
- Bank of America and US Bank: https://www.moneycrashers.com/credit-card-price-protection/

**Benefits are card-level, not issuer-level. Store them per card, with the guide URL and date.**

## 7. Messaging channels

- **10DLC**: unregistered US A2P 10DLC traffic has been fully blocked since 2023-09-01. https://www.twilio.com/en-us/changelog/-u-s--a2p-10dlc--full-blocking-of-traffic-sent-from-unregistered . Campaign review takes 3–5 business days at Bandwidth https://www.bandwidth.com/support/en/articles/12823080 . Vonage says up to 7 days. Zoho says about 2 weeks. The sole-proprietor tier allows 1 campaign, 1 number and needs OTP verification. https://telnyx.com/release-notes/10dlc-sole-proprietor-support.md . **Even a small bot needs registration**, or else a verified toll-free number.
- **SMS**: no E2E encryption. The carrier, the provider (Twilio etc.) and the bot server see the content.
- **Telegram bots**: they use server-client encryption only. Secret chats are E2E but device-specific, and bots "can see messages you send to them". Telegram's servers see bot traffic. https://telegram.org/faq
- **Signal**: E2E encryption by default, but there is **no official bot API**. Bots use the unofficial signal-cli, with a ban risk. https://github.com/AsamK/signal-cli , https://www.vaquill.ai/docs/integrations/chatbots/signal
- **Email**: no E2E encryption by default. The mail providers on both ends can read it (UNVERIFIED).
- **Local MCP server (stdio)**: runs as a local subprocess with no network hop, so no third party sees the content. Only the LLM provider the user's client calls does. https://modelcontextprotocol.io/specification/2025-06-18/basic/transports

## 8. Chrome extension permissions

- **activeTab** is granted only by a user gesture: the action button, a context menu item, a keyboard shortcut or the omnibox. Without one, you get no URL and cannot inject a script. **Automatic checkout detection is not possible with activeTab alone.** https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- **Optional host permissions**: declare `https://*/*` in `optional_host_permissions`, then call `chrome.permissions.request` for specific origins, one site at a time. The call needs a user gesture. https://developer.chrome.com/docs/extensions/reference/api/permissions . Registering content scripts dynamically afterwards uses `chrome.scripting.registerContentScripts`; that combination is UNVERIFIED here.
- **externally_connectable**: a web app whose origin is listed in `matches` can call `runtime.sendMessage` or `runtime.connect` with the extension ID. The extension receives these through `onMessageExternal`. "It is not possible to send a message from an extension to a web page", so the web app must start each exchange (a port can stay open). Check `sender.url`. https://developer.chrome.com/docs/extensions/develop/concepts/messaging
