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

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	...(e2e ? { outDir: ".output/e2e" } : {}),
	// Function form so .env values are loaded before the manifest is built.
	manifest: () => {
		const webOrigin =
			(import.meta.env.WXT_WEB_ORIGIN as string | undefined) ??
			"http://localhost:3001";
		return {
			name: "Pointmaxx",
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
