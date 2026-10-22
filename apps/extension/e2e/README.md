# Extension e2e tests

Playwright drives the real extension in headless Chromium. Each test gets a
fresh profile with the `WXT_E2E=1` build loaded from `.output/e2e/chrome-mv3`.

```sh
cd apps/extension
bunx playwright install chromium   # once
bun run test:e2e                   # build the e2e bundle, run every test
```

## How it works

- `WXT_E2E=1` (`bun run build:e2e`) adds host permissions for the four fixture
  hosts and lets the popup read `?tab=<id>` instead of the active tab. A popup
  opened in a tab is the active tab, so the tests pass the store tab's id.
  Release builds do not include either change.
- `harness.ts` serves `fixtures/*.html` at the real hostnames with
  `context.route`. Every other request is aborted and recorded. After each
  test, it asserts that nothing reached a non-fixture host and that the popup
  made no request at all.
- Helpers: `openStore("bestbuy")` opens a fixture page, `openPopupFor(page)`
  opens the popup for that tab (no argument means no store tab), and
  `seedWallet([...cardIds])` writes the wallet through the service worker.
- Select elements by role and visible text, not CSS classes, so restyles do
  not break the tests.

## Debugging

Run one test headed, by title or by file and line:

```sh
bun run build:e2e
bunx playwright test -g "grocery" --headed
bunx playwright test e2e/popup.spec.ts:<line> --headed --debug  # step through
```

On failure, the harness saves a screenshot of each open page and a trace under
`e2e/.results/artifacts/<test>/`. The HTML report is in `e2e/.results/report`.
CI uploads both as the `e2e-results` artifact.

```sh
bunx playwright show-trace e2e/.results/artifacts/<test>/trace.zip
bunx playwright show-report e2e/.results/report
```

`playwright.config.ts` has `trace` off on purpose. The harness starts tracing
itself, because the persistent context is created by hand.

## Adding a fixture

1. Write a small, hand-made page in `fixtures/<store>.html`. Mimic the markup
   that matters (JSON-LD, `og:` and `product:` meta tags). Never copy a real
   retailer page.
2. Add the store and its hostname to `stores` in `harness.ts`.
3. Add the same host to `e2eHosts` in `wxt.config.ts`, so `executeScript` can
   read the page.
4. Every fixture is served at `https://<host>/product/fixture`.
