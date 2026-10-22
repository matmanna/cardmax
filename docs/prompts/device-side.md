# Agent prompt: device side (@matmanna)

You are building the device side of Pointmaxx, a privacy-first credit card optimizer, for a four-hour hackathon on the personal agents and data privacy track. A teammate's agent is building the cloud side in parallel.

Read these first:
- `docs/DECISIONS.md` covers the product, privacy rules, and what is cut.
- `docs/WORK_SPLIT.md` covers ownership, merge rules, and the timeline.
- `packages/core/src/schema.ts` is the shared contract.
- `docs/research/` has background research with sources.

## You own

`apps/extension/` (WXT with React) and `packages/core/`. Do not edit any other path. Ask the human for changes elsewhere.

## Build, in order

1. **Card catalog.** Export a `catalog: CardProduct[]` from `packages/core` with about 5 popular US cards. Use real earn rates, each with a `sourceUrl` to the issuer page and a `checkedOn` date. Include known exclusions, such as Amex grocery excluding Target, Walmart, and warehouse clubs. Never invent a rate. If you cannot verify one, leave the card out.
2. **Merchant map.** Export a curated map from about 30 common US shopping domains to a `MerchantGuess`.
3. **Popup wallet.** Pick cards from the catalog, store them in `chrome.storage.local`, and add a delete-all control that also stops sends. Store issuer and product only.
4. **Recommendation.** On popup open, read the active tab using `activeTab` plus `chrome.scripting.executeScript` (add the `scripting` permission). Guess the merchant: the curated map first, then a page heuristic, then a user override. Show `recommend()` output with the confidence level and the reason. Label the 1-cent point value as an assumption.
5. **Product extraction.** Read the title, the price, and a UPC from JSON-LD `gtin*` fields, then microdata or `og` meta tags, and fall back to the title alone.
6. **Payload panel and consent.** Before the alternative-listing lookup, show the exact `ListingQuery` JSON that will be sent and where it goes. Send only on click. Call the cloud API's listing search (Person B builds it) and rank results by net price: price minus the reward from the user's best card at that merchant.
7. **Web app bridge.** Add `externally_connectable` for the web app origin, and handle `ExtensionMessage` (`cardmax:getWallet`, `cardmax:setWallet`) in the background script. Validate every message with zod.
8. **Per-site access, if time allows.** Offer a button that calls `chrome.permissions.request` for the current site, so the extension can suggest a card automatically on that site's checkout page.

## Constraints

- `recommend()` and all merchant guessing run on the device. Never add a network call to `packages/core`.
- The only data that leaves the device is a `ListingQuery`, and only after a click.
- If you change `schema.ts`, tell the human so they can update the teammate. Keep changes additive.
- Follow the existing code style, and run `bun run check` and `bun run check-types` before each commit.
- Use small commits on `a/<topic>` branches.

## Done when

The demo runs end to end. Add cards, open a Best Buy product page, see the best card with a reason, see the payload panel, click send, see net-price-ranked listings, then press revoke and see the wallet gone.
