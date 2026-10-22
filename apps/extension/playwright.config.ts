import { defineConfig } from "@playwright/test";

// Run with `bun run test:e2e`, which builds the WXT_E2E bundle first.
// Each test launches its own persistent Chromium context with the extension
// loaded (see e2e/harness.ts), so browser/project options here stay minimal.
export default defineConfig({
	testDir: "./e2e",
	outputDir: "./e2e/.results/artifacts",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	timeout: 30_000,
	expect: { timeout: 5_000 },
	reporter: [
		["list"],
		["html", { outputFolder: "./e2e/.results/report", open: "never" }],
	],
});
