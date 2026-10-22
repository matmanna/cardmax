import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 3001,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		// Vercel functions don't ship the varlock binary, so resolve env at build
		// time there (server bundle only). Locally, keep loading .env at runtime.
		varlockVitePlugin({
			ssrInjectMode: process.env.VERCEL ? "resolved-env" : "auto-load",
		}),
		tailwindcss(),
		tanstackStart(),
		nitro(),
		viteReact(),
	],
});
