import { supportedStoreDomains } from "@cardmax/core";
import { useEffect, useState } from "react";

import {
	hasSiteAccess,
	hasSupportedStores,
	removeSiteAccess,
	removeSupportedStores,
	requestSiteAccess,
	requestSupportedStores,
} from "@/lib/permissions";

type Props = { origin: string; domain: string };

// Matches "10 Popup · Automatic on this site" in the Paper file. Known stores
// share one switch for the whole supported list; anything else is per site.
export function SiteAccess({ origin, domain }: Props) {
	const supported = supportedStoreDomains.includes(domain);
	const [on, setOn] = useState<boolean | null>(null);

	useEffect(() => {
		(supported ? hasSupportedStores() : hasSiteAccess(origin)).then(setOn);
	}, [origin, supported]);

	async function toggle() {
		// Chrome only shows the permission prompt if this is the first await.
		if (supported) {
			setOn(
				on ? !(await removeSupportedStores()) : await requestSupportedStores(),
			);
		} else {
			setOn(
				on
					? !(await removeSiteAccess(origin))
					: await requestSiteAccess(origin),
			);
		}
	}

	if (on === null) return null;

	const label = supported
		? on
			? `Automatic on ${supportedStoreDomains.length} supported stores`
			: "Open at checkout on supported stores"
		: on
			? `Automatic on ${domain}`
			: `Open at checkout on ${domain}`;

	return (
		<div className="site-access">
			<span>
				{label}
				{on && <small>Opens by itself at checkout. Nothing is sent.</small>}
			</span>
			<button
				type="button"
				role="switch"
				aria-checked={on}
				aria-label={label}
				className="switch"
				onClick={toggle}
			/>
		</div>
	);
}
