import { defineConfig } from "wxt";

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	manifest: {
		name: "Cardmax",
		description: "Pick the best card for this merchant, on your device.",
		// No host permissions by default. Per-site access is requested at runtime.
		permissions: ["activeTab", "storage"],
		optional_host_permissions: ["https://*/*"],
	},
});
