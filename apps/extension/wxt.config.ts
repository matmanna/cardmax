import { defineConfig } from "wxt";

// WXT_E2E=1 builds a test-only bundle for Playwright (see e2e/README.md). It
// goes to its own output dir and grants the fixture hosts, because a popup
// opened in a tab gets no activeTab grant. Never set it for a release build.
const e2e = Boolean(process.env.WXT_E2E);

// Fixture hosts the e2e tests serve with context.route. Nothing else.
const e2eHosts = [
	"https://www.bestbuy.com/*",
	"https://www.walmart.com/*",
	"https://www.target.com/*",
	"https://www.amazon.com/*",
	"https://www.costco.com/*",
];

// Public half of the extension signing key. It pins the extension ID to
// idhdmipfkciggnihmadkcofgachjneng on every machine, so the web app's
// EXTENSION_ID matches unpacked installs. Safe to commit: it is a public key.
// The Chrome Web Store rejects a manifest key, so strip it for a store build.
const manifestKey =
	"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4okyuDjy07ADpJhbGQXGkwENBlD8/4fCkX5zVWv5CmQ/r9fygCPlFTwF82TzgAvdO+pxPSnE0r6N5SW70l5P22ghVxmGSDbVagVJn/WSWUkU/VvX62rvXq2xsiCVT2lkU86fbSM3SFtDVEQ2ubNCH0R1HbcEg283cKK43Y8fTwbwvZ5YMH8JanFA1EFGUgDX/0gKHVty5wb6RBlHrvTs49rmpFp2/VtnJ72btdWgmAutLizdzNKQF3Y3V/O6N6/ycjAw6wUxQImK+95DCleOoZ738Mq3Uub3blEczeg6F4xHEux6Ygo5Rz2z5TkSMkDtxsq4ZEDlRvvrqsF8f5YnwQIDAQAB";

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	...(e2e ? { outDir: ".output/e2e" } : {}),
	// Function form so .env values are loaded before the manifest is built.
	manifest: ({ command }) => {
		// Keep in sync with lib/origins.ts. Release builds accept only
		// production. Never add localhost here, or any local page could message
		// the extension.
		const webOrigin =
			(import.meta.env.WXT_WEB_ORIGIN as string | undefined) ||
			(command === "serve" ? "http://localhost:3001" : "https://pointmaxx.ing");
		return {
			name: "Pointmaxx",
			key: manifestKey,
			description: "Pick the best card for this merchant, on your device.",
			// No host permissions by default. Per-site access is requested at runtime.
			permissions: ["activeTab", "storage", "scripting"],
			action: { default_title: "Pointmaxx" },
			optional_host_permissions: ["https://*/*"],
			...(e2e ? { host_permissions: e2eHosts } : {}),
			// Only the web app can message the extension.
			externally_connectable: { matches: [`${webOrigin}/*`] },
		};
	},
});
