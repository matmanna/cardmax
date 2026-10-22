import { defineConfig } from "wxt";

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	// Function form so .env values are loaded before the manifest is built.
	manifest: () => {
		const webOrigin =
			(import.meta.env.WXT_WEB_ORIGIN as string | undefined) ??
			"http://localhost:3001";
		return {
			name: "Cardmax",
			description: "Pick the best card for this merchant, on your device.",
			// No host permissions by default. Per-site access is requested at runtime.
			permissions: ["activeTab", "storage", "scripting"],
			optional_host_permissions: ["https://*/*"],
			// Only the web app can message the extension.
			externally_connectable: { matches: [`${webOrigin}/*`] },
		};
	},
});
