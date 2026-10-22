import {
	type Category,
	catalog,
	category,
	guessMerchant,
	type ListingQuery,
	type MerchantGuess,
	type Product,
	parseProduct,
	type RankedListing,
	rankListings,
	recommend,
	toListingQuery,
	type WalletCard,
} from "@cardmax/core";
import { useEffect, useState } from "react";

import { listingsEndpoint, searchListings } from "@/lib/api";
import { pageSignals, readActiveTab } from "@/lib/page";
import { type Settings, setOverride } from "@/lib/storage";

type Props = {
	wallet: WalletCard[];
	settings: Settings;
	onChange: () => void;
};

type Lookup =
	| { state: "idle" }
	| { state: "confirm"; query: ListingQuery }
	| { state: "sending" }
	| { state: "done"; results: RankedListing[] }
	| { state: "error"; message: string };

const cardName = new Map(catalog.map((card) => [card.id, card.name]));

function usd(value: number) {
	return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function PageTab({ wallet, settings, onChange }: Props) {
	const [hostname, setHostname] = useState<string | null>(null);
	const [merchant, setMerchant] = useState<MerchantGuess | null>(null);
	const [product, setProduct] = useState<Product | null>(null);
	const [amount, setAmount] = useState(100);
	const [lookup, setLookup] = useState<Lookup>({ state: "idle" });

	useEffect(() => {
		readActiveTab().then((page) => {
			if (!page) return;
			const parsed = parseProduct(page.raw);
			setHostname(page.hostname);
			setProduct(parsed);
			if (parsed?.priceUsd) setAmount(parsed.priceUsd);
			setMerchant(
				guessMerchant(
					page.hostname,
					pageSignals(page.raw),
					settings.overrides,
				),
			);
		});
	}, [settings.overrides]);

	if (!hostname || !merchant) {
		return (
			<section>
				<p className="muted">Open a store page to get a card suggestion.</p>
			</section>
		);
	}

	const ranked = recommend(
		wallet,
		catalog,
		merchant,
		amount,
		settings.centsPerPoint,
	);
	const [best, ...rest] = ranked;

	async function override(value: Category) {
		if (!merchant) return;
		await setOverride(merchant.domain, value);
		onChange();
	}

	async function send(query: ListingQuery) {
		setLookup({ state: "sending" });
		try {
			const listings = await searchListings(query);
			setLookup({
				state: "done",
				results: rankListings(
					listings,
					wallet,
					catalog,
					settings.centsPerPoint,
				),
			});
		} catch (error) {
			setLookup({
				state: "error",
				message: error instanceof Error ? error.message : "Lookup failed",
			});
		}
	}

	return (
		<section>
			<div className="merchant">
				<div>
					<strong>{merchant.domain}</strong>
					<span className={`chip ${merchant.confidence}`}>
						{merchant.confidence} confidence
					</span>
				</div>
				<label>
					Codes as
					<select
						value={merchant.category}
						onChange={(event) => override(event.target.value as Category)}
					>
						{category.options.map((option) => (
							<option key={option} value={option}>
								{option.replace("_", " ")}
							</option>
						))}
					</select>
				</label>
			</div>

			<label className="amount">
				Amount
				<input
					type="number"
					min={0}
					step="0.01"
					value={amount}
					onChange={(event) => setAmount(Number(event.target.value) || 0)}
				/>
			</label>

			{best ? (
				<>
					<div className="best">
						<span className="muted">Use</span>
						<strong>{cardName.get(best.cardId)}</strong>
						<span className="reward">
							≈ {usd(best.estimatedRewardUsd)} back
						</span>
						<small>{best.reason}</small>
					</div>
					<ol className="rest">
						{rest.map((rec) => (
							<li key={rec.cardId}>
								<span>{cardName.get(rec.cardId)}</span>
								<span>{usd(rec.estimatedRewardUsd)}</span>
							</li>
						))}
					</ol>
					<small className="muted">
						Points valued at {settings.centsPerPoint}¢ each.
					</small>
				</>
			) : (
				<p className="muted">Add cards in the Wallet tab.</p>
			)}

			{product && (
				<div className="lookup">
					<strong>{product.title}</strong>
					{lookup.state === "idle" &&
						(settings.sendsEnabled ? (
							<button
								type="button"
								onClick={() =>
									setLookup({
										state: "confirm",
										query: toListingQuery(product),
									})
								}
							>
								Compare at other stores
							</button>
						) : (
							<small className="muted">Sends are off.</small>
						))}
					{lookup.state === "confirm" && (
						<div className="payload">
							<span>This leaves your device:</span>
							<pre>{JSON.stringify(lookup.query, null, 2)}</pre>
							<small>To: {listingsEndpoint}</small>
							<div className="actions">
								<button type="button" onClick={() => send(lookup.query)}>
									Send
								</button>
								<button
									type="button"
									className="secondary"
									onClick={() => setLookup({ state: "idle" })}
								>
									Cancel
								</button>
							</div>
						</div>
					)}
					{lookup.state === "sending" && <small>Looking up…</small>}
					{lookup.state === "error" && (
						<small className="error">{lookup.message}</small>
					)}
					{lookup.state === "done" && (
						<ol className="listings">
							{lookup.results.map(({ listing, best: card, netPriceUsd }) => (
								<li key={listing.url}>
									<a href={listing.url} target="_blank" rel="noreferrer">
										{listing.merchant}
									</a>
									<span>{usd(listing.priceUsd)}</span>
									<strong>{usd(netPriceUsd)} net</strong>
									{card && <small>with {cardName.get(card.cardId)}</small>}
								</li>
							))}
						</ol>
					)}
				</div>
			)}
		</section>
	);
}
