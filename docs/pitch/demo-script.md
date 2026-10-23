# Pointmaxx live demo script

A 5-minute talk with the slides, plus a live demo in Chrome and on a phone. Every rubric line is covered at least once; the checklist at the end shows where.

## Before you go on

**Laptop**
- Chrome with the Pointmaxx extension pinned and signed in. The wallet holds Citi Double Cash, Chase Freedom Unlimited, and American Express Gold Card.
- Tab 1: the slides, full screen.
- Tab 2: a Best Buy product page with a UPC in its schema.org data (the 65" Sony Bravia 7 is the one in the slides).
- Tab 3: a Shopify store's checkout page, to show a low-confidence guess.
- Tab 4: `pointmaxx.ing/sync`, signed in.
- Turn "Automatic on this site" **off** for bestbuy.com, so you can grant it live.
- Open DevTools on Tab 2, Network panel, filtered to `Fetch/XHR`, then close the panel. You'll reopen it during the consent step.

**Phone**
- Linked to the demo account already, so you don't wait on a code. Practice the link flow once anyway, in case of questions.
- A photo of a storefront in the camera roll (Whole Foods works well; any clear sign is fine).
- Ringer on and loud enough for the room.

**Backup**
- A screen recording of the full demo, in case the venue Wi-Fi or SMS delivery is slow. Say "here's the same flow recorded an hour ago" and keep talking.

## Run of show

| Time | Slide or screen | What you do | What it proves |
| --- | --- | --- | --- |
| 0:00 | Cover | Open on the browser mock | One sentence of value |
| 0:20 | The problem | Read two numbers, name the user | User value, market |
| 0:50 | The idea | Store sets the rate | Why it's hard |
| 1:10 | **Live: Chrome** | Popup pick, then Shopify low confidence | Working core, usability |
| 2:00 | **Live: consent** | Compare, read the payload, Send; grant one site | Track requirement: consent in action |
| 2:45 | Public data | Sources and limits | Track requirement: public data |
| 3:05 | **Live: phone** | Text "costco", then a shopfront photo | The agent |
| 3:45 | What the AI sees | One model, one job | Responsible data use |
| 4:10 | Who sees what | Walk the table fast | Honesty about tradeoffs |
| 4:30 | Built and working | Stack, tests, live URL | Technical execution |
| 4:45 | Roadmap | One line per theme, then close | Originality, direction |

## Talk track

### 0:00 · Cover

> "This is Pointmaxx. It tells you which of your credit cards earns the most at the store you're on, and it does that without asking for a card number or your purchase history."

### 0:20 · The problem

> "Americans put three point six trillion dollars on credit cards last year, and the average person has almost four active cards. So the choice at checkout is real money. But two-thirds of people say they barely understand what companies do with their data, so 'just link your bank account' isn't a good answer."

> "Our user is someone with two to four rewards cards who shops online and in stores, and doesn't want to hand over bank access to get help."

### 0:50 · The idea

> "Here's the part most people don't know: the reward depends on how the *store* codes the charge, not on what you're buying. A TV at Costco earns the warehouse-club rate. Shopify checkouts can show up as the platform, not the store. So the hard problem is guessing the merchant category, and being honest about how sure you are."

### 1:10 · Live: the pick in Chrome

Switch to Tab 2 (Best Buy). Click the Pointmaxx icon.

> "I'm on Best Buy, looking at a twelve-hundred-dollar TV. Pointmaxx read the domain and the price from this tab, guessed 'online retail', and ranked my three cards. Citi Double Cash earns twenty-four dollars here. The next best earns eighteen. That's six dollars on one purchase, and it shows the reason, not just the answer."

Point at the category dropdown.

> "If the guess is wrong, one click fixes it, and it remembers."

Switch to Tab 3 (Shopify checkout). Click the icon.

> "On a Shopify checkout, it shows the store's own name and says low confidence, check the category. We'd rather say we're not sure than be confidently wrong."

### 2:00 · Live: consent in action

Back on Tab 2. Open DevTools, Network panel.

> "Everything you just saw ran in the browser. Watch the network panel: nothing has gone out."

Click **Compare at other stores**.

> "Now I want to check other stores. Before anything leaves, the popup shows me the exact object it will send. It's just the product's UPC. Not my cards, not the price I'm paying, not who I am."

Press **Send**. Point at the single request in the Network panel.

> "I pressed Send, and that one request went to our server, which asks the Best Buy API and ranks results by price minus what my best card earns there. If I'd pressed Cancel, nothing would have gone anywhere."

Turn on **Automatic on this site**. Chrome's permission prompt appears.

> "Automatic suggestions work the same way. Chrome asks me to grant this one site. Not all sites at install. Just this one, from my click."

Accept. Point at the toolbar badge showing `2%`.

### 2:45 · Public data

> "The data behind this is public, and it has real gaps. There's no open dataset of card category rates. The CFPB survey has fees but not bonus categories, so we curate earn rules from issuer pages, each with a source link and a date. Prices come from the Best Buy API. Walmart is waiting on affiliate approval, and Amazon's API needs sales we don't have. Every gap shows up in the product as a confidence label or a fallback."

### 3:05 · Live: the agent on a phone

Hold the phone up, or mirror it.

> "At a store, you won't open a browser. So you text it."

Text `costco`. Read the reply aloud when it arrives.

> "It matched the store by code, checked my synced wallet, and replied with the card and why."

Send the storefront photo.

> "Or, if you don't know the store's exact name, send a photo of the shopfront."

Read the reply: the store name, the confidence, and the card.

### 3:45 · What the AI sees

> "That photo is the only thing an AI model sees in this whole product. Picking a card is rules and math we wrote. The server strips the location data from the photo first, and the model gets one question: which store is this? It returns a name, a domain, and a confidence. It never sees my number, my wallet, or the card we chose. If it can't tell, the bot asks me for the name instead of guessing."

### 4:10 · Who sees what

> "Here's everyone who touches your data. Your browser sees the most, and nothing leaves it without a click. Our server holds card names if you opt in, and your phone number. SMS isn't end-to-end encrypted, so Twilio and carriers can read texts, and the bot's first message tells you that."

### 4:30 · Built and working

> "It's live at pointmaxx.ing. The extension, wallet sync, price compare, and the Twilio agent all work today, with 96 unit tests and 26 browser tests. Some of those browser tests exist only to fail if anything leaves the device without a user action."

### 4:45 · Roadmap and close

> "Next we want to model issuer exclusions per card, factor in purchase protections on big buys, and add a local MCP server so your own assistant can ask Pointmaxx with no messaging provider in between."

> "Pointmaxx: the right card at every checkout, and you approve every byte that leaves your device. Thanks."

## Rubric coverage

| Rubric item | Points | Where it's shown |
| --- | --- | --- |
| User Value & Impact | 25 | The problem slide (stats and named user); live pick showing $24 vs $18 on one purchase; the agent for in-store purchases |
| Technical Execution | 25 | Live extension pick, live Compare against the Best Buy API, live Twilio replies and photo reading; "Built and working" slide (96 unit and 26 browser tests, live URL) |
| Originality & Creativity | 20 | Merchant-coded rewards insight; confidence shown to the user; net-price ranking; photo-to-store agent; privacy enforced by tests |
| Track Alignment & Responsible Data Use | 20 | Consent demo in DevTools; per-site grant; wallet sync off by default; "What the AI sees" and "Who sees what" slides; honest SMS disclosure |
| Usability & Demo Clarity | 10 | One-click popup, plain-language reasons, one-click override, a text that works on any phone |
| Track: Personal Agents & Data Privacy | required | The live payload panel and Send button, and Chrome's one-site permission prompt |
| Track: Public Data APIs | required | Public data slide: issuer pages, schema.org data, Best Buy API, and the limits of each |

## Likely questions

**How accurate is the category guess?**
For the 115 domains in our curated map, it's a known code, so it's high confidence. Outside that, it's a page heuristic, and we label it medium or low. Card networks set the real code at charge time, so no one can be certain in advance. That's why we show confidence and make the override one click.

**Where do the earn rates come from, and how do you keep them current?**
Hand-curated from issuer benefit pages. Every rule stores its source URL and the date we checked it. There's no public dataset of category rates, so this is the honest way to start. An open, sourced catalog is on the roadmap.

**Why not just link a bank account, like budgeting apps do?**
You don't need transactions to answer "which card here?" The question is about the store and your card list, so we only ask for those. It's less data and a faster answer.

**What does the server actually store?**
Card names if you opt in to sync, your phone number if you link it, and short-lived link codes. No card numbers, amounts, purchases, or browsing. No message log beyond the current request.

**Is the text agent private?**
Not end-to-end. SMS can be read by Twilio and carriers, and the bot says so in its first message. We keep anything sensitive out of the conversation: it never asks for amounts or card numbers.

**What does the AI see, exactly?**
Only a storefront photo you choose to text, with EXIF and GPS stripped, plus a fixed prompt that asks for the store's name. It returns name, domain, and confidence. Card selection happens afterward in our own code. Anthropic's API terms don't allow training on that request.

**Why not use an LLM for the recommendation too?**
Money decisions should be explainable and testable. Rules and math give the same answer every time, and we can unit-test them. The model is only good at the part code can't do: reading a photo.

**How do you prove nothing leaves the device?**
Playwright tests load real store pages and watch every network request. They fail if a request goes out without a matching user action, and one test checks the exact shape of the Compare request.

**Does it work on Amazon? On Android?**
Compare can't price-check Amazon yet because its product API now requires affiliate sales. The popup pick still works on Amazon. The text agent uses SMS, so it works on Android and iPhone.

**How do you make money?**
We're free while in beta. Commissions on Compare referrals are one option. We wouldn't take money for steering card choices, because that breaks the reason people trust the pick.

**What if my card isn't in the catalog?**
There are 8 cards today, all verified on issuer pages. Adding one is a reviewed data change with a source link, and we add them on request.
