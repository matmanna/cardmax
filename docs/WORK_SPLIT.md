# Work split

Two people. Each person owns separate directories, so the two of you rarely edit the same file.

## What's new (updated 2026-10-22)

**Done and merged on `main`:**
- **Core engine (`packages/core`):** `recommend()`, merchant guessing, product parsing, net-price ranking, and an 8-card catalog verified on issuer pages. Reasons now read "2% back on everything" for cash-back cards and "4x points on dining" for points cards.
- **Extension:** the popup has the card pick, a category override, the payload panel with Send and Cancel, the wallet, and revoke. It is styled from the Paper design.
- **Tests:** a Playwright e2e suite with 12 tests that fail if anything leaves the device unexpectedly. CI runs it on every PR.
- **Database:** a Neon Postgres database. The Better Auth schema is pushed, and the URL is in Matt's local `apps/web/.env`. The database is temporary until claimed, and it expires 2026-10-25.

**Open for review:**
- **PR #4, landing page:** built in `apps/web` from the Paper artboard "Landing — product". It shows a Chrome window with the popup open, tabs for the extension, text messages, and the dashboard, an animated flowchart that runs the real engine, and privacy plus FAQ. @cloudhoppr: this is in your area, so please review it rather than rebuild it.

**New features added to the plan:**
- **Storefront photos.** Text a photo of a store or its logo and get the best card back. See "Storefront photos" in `docs/DECISIONS.md`.
- **Text channel that works for Android too.** Photon is iMessage-first, and part of the team uses Android. Twilio SMS and MMS is being evaluated, along with Twilio's MCP server so an agent can set it up. Build the agent behind a channel adapter (below) so the channel can change without a rewrite.
- **Web dashboard** at `/wallet`, matching the dashboard tab on the landing page: the synced wallet table, the text agent panel, and a "what our server holds" panel.

## Ownership

| Area                                                            | Owner                             | Paths                                                                                          |
| --------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Device side: extension and recommendation engine                | Person A (@matmanna)              | `apps/extension/`, `packages/core/`                                                            |
| Cloud side: web app, accounts, sync, listing lookup, text agent | Person B (@cloudhoppr)            | `apps/web/`, `packages/api/`, `packages/auth/`, `packages/db/`, `packages/agent/` (when added) |
| Repo root config                                                | Person B (@cloudhoppr)            | `package.json`, `turbo.json`, `biome.json`, `bun.lock`                                         |
| Shared UI kit                                                   | Nobody edits during the hackathon | `packages/ui/`                                                                                 |
| Designs                                                         | Both, in the Paper file "Cardmax" | Design UI changes in Paper first, then build them                                              |

## Remaining work

### Person B (@cloudhoppr), in order

| #   | Task                                                                                                                            | Status                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | Review and merge PR #4 (landing page)                                                                                           | **New**                                               |
| 2   | Better Auth sign-in works against Neon, and the first deploy is on Vercel                                                       | To do                                                 |
| 3   | Wallet sync: a `wallet` table, `wallet.get` and `wallet.put`, an opt-in at sign-up, and a sync page that talks to the extension | To do                                                 |
| 4   | `listings.search` at `/api/rpc` with Best Buy, then Walmart. Allow CORS from the extension origin                               | To do                                                 |
| 5   | `/wallet` dashboard, matching the Paper dashboard design                                                                        | **New**                                               |
| 6   | Text agent in `packages/agent` behind a channel adapter, with phone linking by one-time code                                    | **Changed:** the channel is no longer fixed to Photon |
| 7   | Storefront photo flow: strip EXIF, identify the store with Claude Haiku, reply, delete the media                                | **New**                                               |
| 8   | `/privacy` transparency page: every send, what the server holds, and what the text provider and Anthropic see                   | To do                                                 |

### Person A (@matmanna)

| #   | Task                                                                                                              | Status        |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | Point the extension at the real `listings.search` once task B4 ships, and add an e2e test against a mocked API    | Waiting on B4 |
| 2   | Per-site access button (`requestSiteAccess`), so the extension can suggest a card automatically on checkout pages | To do         |
| 3   | Settle the text channel and write the setup steps (Twilio and MCP, or Photon)                                     | In progress   |
| 4   | Keep the Paper file and the catalog current, and add cards on request                                             | Ongoing       |

## The text agent's channel adapter

Build the agent so that the messaging provider is one small file. Everything else is shared.

```ts
// packages/agent/src/channel.ts
export type Inbound = { from: string; text?: string; imageUrl?: string };

export interface Channel {
	parse(request: Request): Promise<Inbound | null>; // verify the signature, then normalize
	reply(to: string, text: string): Promise<void>;
	deleteMedia?(inbound: Inbound): Promise<void>; // after a photo is handled
}
```

`twilio.ts` and `photon.ts` each implement `Channel`. The handler calls `parse`, then the linking or recommendation logic, then `reply`, then `deleteMedia`.

## The contract

`packages/core/src/schema.ts` is the only shared surface. Both apps import types and functions from `@cardmax/core`.
- Only Person A edits `packages/core`. Person B asks in chat for any changes.
- `recommend()` runs on the device and makes no network calls. Keep it that way.
- Recent changes: `CardProduct.rewardCurrency` is required, a `catalog` is exported, and `rankListings()` accepts the user's category overrides.

## Rules that prevent merge conflicts

1. Add dependencies only from inside your own workspace, for example `cd apps/extension && bun add x`. Never add them at the root.
2. If `bun.lock` conflicts, accept either side, run `bun install`, and commit the result. Never hand-merge the lockfile.
3. Use short-lived branches named `a/<topic>` and `b/<topic>`. Rebase on `main` at least once an hour, and merge small changes often.
4. Before you push, run `bun run check` and `bun run check-types`.
5. Never commit `.env` files. Add new variables to the matching `.env.schema` file.

Decisions behind this plan are in `docs/DECISIONS.md`. Agent prompts for each side are in `docs/prompts/`.
