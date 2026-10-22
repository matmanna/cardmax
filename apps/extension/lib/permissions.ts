// Per-site access. origin is like "https://www.example.com".
export async function hasSiteAccess(origin: string): Promise<boolean> {
	return browser.permissions.contains({ origins: [`${origin}/*`] });
}

// Call straight from a click handler, before any other await, or Chrome rejects it.
export async function requestSiteAccess(origin: string): Promise<boolean> {
	return browser.permissions.request({ origins: [`${origin}/*`] });
}
