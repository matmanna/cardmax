# Work split

Two people, about four hours. Each person owns separate directories, so the two of you rarely edit the same file.

## Ownership

| Area                                                            | Owner                             | Paths                                                                                          |
| --------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Device side: extension and recommendation engine                | Person A (@matmanna)              | `apps/extension/`, `packages/core/`                                                            |
| Cloud side: web app, accounts, sync, listing lookup, text agent | Person B (@cloudhoppr)            | `apps/web/`, `packages/api/`, `packages/auth/`, `packages/db/`, `packages/agent/` (when added) |
| Repo root config                                                | Person B (@cloudhoppr)            | `package.json`, `turbo.json`, `biome.json`, `bun.lock`                                         |
| Shared UI kit                                                   | Nobody edits during the hackathon | `packages/ui/`                                                                                 |

## The contract

`packages/core/src/schema.ts` is the only shared surface. Both apps import types and `recommend()` from `@cardmax/core`.
- Agree on the schema together in the first 20 minutes.
- After that, only Person A edits `packages/core`. Person B asks in chat for any changes.
- `recommend()` runs on the device and makes no network calls. Keep it that way.

## Rules that prevent merge conflicts

1. Add dependencies only from inside your own workspace, for example `cd apps/extension && bun add x`. Never add them at the root.
2. If `bun.lock` conflicts, accept either side, run `bun install`, and commit the result. Never hand-merge the lockfile.
3. Use short-lived branches named `a/<topic>` and `b/<topic>`. Rebase on `main` at least once an hour, and merge small changes often.
4. Before you push, run `bun run check` and `bun run check-types`.
5. Never commit `.env` files. Add new variables to the matching `.env.schema` file.

## Timeline

| Time         | Person A (device side)                                                                                                                   | Person B (cloud side)                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00 to 0:20 | Together: lock the schema and seed about 5 real cards in the catalog, each with a source URL                                             | Together                                                                                                                                   |
| 0:20 to 1:30 | Popup wallet: pick cards from the catalog, store them in `chrome.storage`, delete-all button                                             | Neon database, Better Auth sign-in, first deploy                                                                                           |
| 1:30 to 2:30 | Merchant guess for the active tab (curated domain map, then a page heuristic), show `recommend()` output with confidence and an override | Sync endpoint that stores the wallet as one opaque blob per user, with no transactions                                                     |
| 2:30 to 3:15 | Payload panel and consent prompt for the alternative-listing lookup, net-price ranking, plus a revoke control                            | Listing lookup endpoint (Best Buy, then Walmart), text agent webhook that calls `recommend()`, and a public "what leaves your device" page |
| 3:15 to 4:00 | Together: integrate, rehearse the demo, freeze `main`                                                                                    | Together                                                                                                                                   |

Decisions behind this plan are in `docs/DECISIONS.md`. Agent prompts for each side are in `docs/prompts/`.
