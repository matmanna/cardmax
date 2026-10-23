import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 3001,
		// Quick tunnels for testing the Photon and Twilio webhooks against the dev server.
		allowedHosts: [".trycloudflare.com"],
	},
	resolve: {
		tsconfigPaths: true,
		// See src/lib/with-selector-shim.ts.
		alias: process.env.VERCEL
			? [
					{
						find: /^use-sync-external-store\/shim\/with-selector$/,
						replacement: new URL(
							"./src/lib/with-selector-shim.ts",
							import.meta.url,
						).pathname,
					},
					{
						find: /^use-sync-external-store\/shim$/,
						replacement: new URL(
							"./src/lib/sync-external-store-shim.ts",
							import.meta.url,
						).pathname,
					},
				]
			: [],
	},
	plugins: [
		// Vercel functions don't ship the varlock binary, so resolve env at build
		// time there (server bundle only). Locally, keep loading .env at runtime.
		varlockVitePlugin({
			ssrInjectMode: process.env.VERCEL ? "resolved-env" : "auto-load",
		}),
		tailwindcss(),
		tanstackStart(),
		// Bun's symlinked node_modules aren't traced into Vercel functions, so bundle
		// every dependency into the server build on Vercel.
		nitro({ noExternals: Boolean(process.env.VERCEL) }),
		viteReact(),
	],
});
