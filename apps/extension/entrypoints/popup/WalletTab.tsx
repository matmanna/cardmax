import type { WalletCard } from "@cardmax/core";

import type { Catalog } from "@/lib/catalog";
import { removeAllSiteAccess } from "@/lib/permissions";
import {
	type Link,
	revokeAll,
	type Settings,
	updateSettings,
	updateWallet,
} from "@/lib/storage";
import { disconnect } from "@/lib/sync";

// Same fallback as externally_connectable in wxt.config.ts.
const webOrigin =
	(import.meta.env.WXT_WEB_ORIGIN as string | undefined) ??
	"http://localhost:3001";

type Props = {
	wallet: WalletCard[];
	settings: Settings;
	catalog: Catalog;
	link: Link | null;
	onChange: () => void;
};

export function WalletTab({
	wallet,
	settings,
	catalog,
	link,
	onChange,
}: Props) {
	const held = new Set(wallet.map((card) => card.cardId));

	async function toggle(cardId: string) {
		await updateWallet((current) =>
			current.some((card) => card.cardId === cardId)
				? current.filter((card) => card.cardId !== cardId)
				: [...current, { cardId, addedAt: new Date().toISOString() }],
		);
		onChange();
	}

	async function revoke() {
		await disconnect();
		await Promise.all([revokeAll(), removeAllSiteAccess()]);
		onChange();
	}

	async function unlink() {
		await disconnect();
		onChange();
	}

	async function resume() {
		await updateSettings({ sendsEnabled: true });
		onChange();
	}

	return (
		<section>
			<p className="intro">Pick the cards you hold. Only the name is saved.</p>
			<ul className="rows cards">
				{catalog.cards.map((card) => (
					<li key={card.id}>
						<label>
							<input
								type="checkbox"
								checked={held.has(card.id)}
								onChange={() => toggle(card.id)}
							/>
							<span>
								<strong>
									{card.issuer} {card.name}
								</strong>
								<small>
									${card.annualFeeUsd} fee ·{" "}
									<a href={card.sourceUrl} target="_blank" rel="noreferrer">
										terms checked {card.checkedOn}
									</a>
								</small>
							</span>
						</label>
					</li>
				))}
			</ul>
			<div className="account-sync">
				{link ? (
					<>
						<span>
							<span className="dot high" />
							Synced with {link.email}
						</span>
						<button type="button" className="link-button" onClick={unlink}>
							Disconnect
						</button>
					</>
				) : (
					<>
						<span>Only on this device</span>
						<a href={`${webOrigin}/sync`} target="_blank" rel="noreferrer">
							Sync with an account
						</a>
					</>
				)}
			</div>
			<div className="danger-zone">
				{settings.sendsEnabled ? (
					<button type="button" className="danger" onClick={revoke}>
						Stop all sends and delete my data
					</button>
				) : (
					<>
						<p className="note">Sends are off and local data is deleted.</p>
						<button type="button" onClick={resume}>
							Turn sends back on
						</button>
					</>
				)}
			</div>
		</section>
	);
}
