// Per-site access. origin is like "https://www.example.com".
export async function hasSiteAccess(origin: string): Promise<boolean> {
	return browser.permissions.contains({ origins: [`${origin}/*`] });
}

// Call straight from a click handler, before any other await, or Chrome rejects it.
export async function requestSiteAccess(origin: string): Promise<boolean> {
	return browser.permissions.request({ origins: [`${origin}/*`] });
}

export async function removeSiteAccess(origin: string): Promise<boolean> {
	return browser.permissions.remove({ origins: [`${origin}/*`] });
}

// Revoke: drop every site the user granted. Required hosts (e2e builds only)
// cannot be removed, so failures are ignored.
export async function removeAllSiteAccess(): Promise<void> {
	const { origins = [] } = await browser.permissions.getAll();
	await Promise.all(
		origins.map((origin) =>
			browser.permissions.remove({ origins: [origin] }).catch(() => false),
		),
	);
}
