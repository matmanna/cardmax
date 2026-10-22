import { useEffect, useState } from "react";

import {
	hasSiteAccess,
	removeSiteAccess,
	requestSiteAccess,
} from "@/lib/permissions";

type Props = { origin: string; domain: string };

// Matches "10 Popup · Automatic on this site" in the Paper file.
export function SiteAccess({ origin, domain }: Props) {
	const [on, setOn] = useState<boolean | null>(null);

	useEffect(() => {
		hasSiteAccess(origin).then(setOn);
	}, [origin]);

	async function toggle() {
		// Chrome only shows the permission prompt if this is the first await.
		const next = on
			? !(await removeSiteAccess(origin))
			: await requestSiteAccess(origin);
		setOn(next);
	}

	if (on === null) return null;

	return (
		<div className="site-access">
			<span>
				{on ? `Automatic on ${domain}` : `Suggest automatically on ${domain}`}
				{on && <small>Opens by itself at checkout here. Nothing is sent.</small>}
			</span>
			<button
				type="button"
				role="switch"
				aria-checked={on}
				aria-label={`Suggest automatically on ${domain}`}
				className="switch"
				onClick={toggle}
			/>
		</div>
	);
}
