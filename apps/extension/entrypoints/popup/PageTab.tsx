import {
	type Category,
	catalog,
	category,
	guessMerchant,
	type ListingQuery,
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
import { type ActiveTab, pageSignals, readActiveTab } from "@/lib/page";
import { type Settings, setOverride } from "@/lib/storage";

import { SiteAccess } from "./SiteAccess";

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

const cardName = new Map(
	catalog.map((card) => [card.id, `${card.issuer} ${card.name}`]),
);

function usd(value: number) {
	return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function PageTab({ wallet, settings, onChange }: Props) {
	const [page, setPage] = useState<ActiveTab | null>(null);
	const [product, setProduct] = useState<Product | null>(null);
	const [amount, setAmount] = useState(100);
	const [lookup, setLookup] = useState<Lookup>({ state: "idle" });

	// Read the tab once; overrides change the merchant guess during render.
	useEffect(() => {
		readActiveTab().then((tab) => {
			if (!tab) return;
			const parsed = parseProduct(tab.raw);
			setPage(tab);
			setProduct(parsed);
			if (parsed?.priceUsd) setAmount(parsed.priceUsd);
		});
	}, []);

	const merchant = page
		? guessMerchant(page.hostname, pageSignals(page.raw), settings.overrides)
		: null;

	if (!merchant) {
		return (
			<section>
				<p className="empty">Open a store page to get a card suggestion.</p>
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
					settings.overrides,
				),
			});
		} catch (error) {
			setLookup({
				state: "error",
				message: error instanceof Error ? error.message : "Lookup failed",
			});
		}
	}

	const hasPoints = catalog.some(
		(card) =>
			card.rewardCurrency === "points" &&
			wallet.some((held) => held.cardId === card.id),
	);

	return (
		<section>
			<div className="merchant">
				<span className="domain">
					<code>{merchant.domain}</code>
					<span
						className={`dot ${merchant.confidence}`}
						title={`${merchant.confidence} confidence`}
					/>
					<span className="sr-only">{merchant.confidence} confidence</span>
				</span>
				<label className="category">
					<span className="sr-only">Codes as</span>
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

			{best ? (
				<>
					<div className="winner">
						<span className="label">Pay with</span>
						<h2>{cardName.get(best.cardId)}</h2>
						<div className="reward">
							<strong>+{usd(best.estimatedRewardUsd)}</strong>
							<span>
								{best.reason} on{" "}
								<label className="amount">
									<span className="sr-only">Amount</span>$
									<input
										type="number"
										min={0}
										step="0.01"
										value={amount}
										onChange={(event) =>
											setAmount(Number(event.target.value) || 0)
										}
									/>
								</label>
							</span>
						</div>
					</div>
					<ol className="rows">
						{rest.map((rec) => (
							<li key={rec.cardId}>
								<span>{cardName.get(rec.cardId)}</span>
								<span>+{usd(rec.estimatedRewardUsd)}</span>
							</li>
						))}
					</ol>
					{hasPoints && (
						<p className="note">Points valued at {settings.centsPerPoint}¢.</p>
					)}
				</>
			) : (
				<p className="empty">Add cards in the Wallet tab.</p>
			)}

			{product && (
				<div className="compare">
					<p className="product">{product.title}</p>
					{lookup.state === "idle" &&
						(settings.sendsEnabled ? (
							<button
								type="button"
								className="secondary"
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
							<p className="note">Sends are off.</p>
						))}
					{lookup.state === "confirm" && (
						<div className="payload">
							<span className="label">Sends to {listingsEndpoint}</span>
							<pre>{JSON.stringify(lookup.query)}</pre>
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
					{lookup.state === "sending" && <p className="note">Looking up…</p>}
					{lookup.state === "error" && (
						<p className="note error">{lookup.message}</p>
					)}
					{lookup.state === "done" && (
						<ol className="rows listings">
							{lookup.results.map(({ listing, best: card, netPriceUsd }) => (
								<li key={listing.url}>
									<span>
										<a href={listing.url} target="_blank" rel="noreferrer">
											{listing.domain.replace(/^www\./, "")}
										</a>
										{card && <small>with {cardName.get(card.cardId)}</small>}
									</span>
									<span className="price">
										<strong>{usd(netPriceUsd)}</strong>
										<small>{usd(listing.priceUsd)} list</small>
									</span>
								</li>
							))}
						</ol>
					)}
				</div>
			)}

			{page?.url.startsWith("https:") && (
				<SiteAccess
					origin={new URL(page.url).origin}
					domain={merchant.domain}
				/>
			)}
		</section>
	);
}
