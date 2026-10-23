// Where the extension talks to. Release builds default to production and dev
// (wxt serve) defaults to local. Env vars override both. Keep the webOrigin
// fallback in sync with externally_connectable in wxt.config.ts.

export const webOrigin: string =
	(import.meta.env.WXT_WEB_ORIGIN as string | undefined) ||
	(import.meta.env.DEV ? "http://localhost:3001" : "https://pointmaxx.ing");

// Unset in dev means offline sample data.
export const apiUrl: string | undefined =
	(import.meta.env.WXT_API_URL as string | undefined) ||
	(import.meta.env.DEV ? undefined : "https://pointmaxx.ing");
