import { catalog, type WalletCard } from "@cardmax/core";

import {
	revokeAll,
	type Settings,
	setWallet,
	updateSettings,
} from "@/lib/storage";

type Props = {
	wallet: WalletCard[];
	settings: Settings;
	onChange: () => void;
};

export function WalletTab({ wallet, settings, onChange }: Props) {
	const held = new Set(wallet.map((card) => card.cardId));

	async function toggle(cardId: string) {
		const next = held.has(cardId)
			? wallet.filter((card) => card.cardId !== cardId)
			: [...wallet, { cardId, addedAt: new Date().toISOString() }];
		await setWallet(next);
		onChange();
	}

	async function revoke() {
		await revokeAll();
		onChange();
	}

	async function resume() {
		await updateSettings({ sendsEnabled: true });
		onChange();
	}

	return (
		<section>
			<p className="muted">
				Pick the cards you hold. Cardmax stores only the issuer and product
				name, never card numbers.
			</p>
			{catalog.length === 0 && (
				<p className="muted">The card catalog is empty in this build.</p>
			)}
			<ul className="cards">
				{catalog.map((card) => (
					<li key={card.id}>
						<label>
							<input
								type="checkbox"
								checked={held.has(card.id)}
								onChange={() => toggle(card.id)}
							/>
							<span>
								<strong>{card.name}</strong>
								<small>
									{card.issuer} · ${card.annualFeeUsd} fee ·{" "}
									<a href={card.sourceUrl} target="_blank" rel="noreferrer">
										terms checked {card.checkedOn}
									</a>
								</small>
							</span>
						</label>
					</li>
				))}
			</ul>
			<div className="danger-zone">
				{settings.sendsEnabled ? (
					<button type="button" className="danger" onClick={revoke}>
						Stop all sends and delete my data
					</button>
				) : (
					<>
						<p className="muted">Sends are off and local data is deleted.</p>
						<button type="button" onClick={resume}>
							Turn sends back on
						</button>
					</>
				)}
			</div>
		</section>
	);
}
