import { catalog, guessMerchant, recommend } from "@cardmax/core";
import {
	ArrowLeft,
	ArrowRight,
	ChevronDown,
	Lock,
	Puzzle,
	RotateCw,
	Star,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { cardLabel, demoStores, runDemo, sampleWallet, usd } from "./demo-data";
import { useInView, usePrefersReducedMotion } from "./motion";

/* Browser window ---------------------------------------------------------- */

export function BrowserFrame({
	url,
	title,
	extensionOpen,
	children,
}: {
	url: string;
	title: string;
	extensionOpen?: boolean;
	children: ReactNode;
}) {
	return (
		<div className="mk-browser">
			<div className="mk-tabstrip">
				<span className="mk-traffic" aria-hidden>
					<i />
					<i />
					<i />
				</span>
				<span className="mk-tab">
					<span className="mk-favicon" />
					{title}
				</span>
			</div>
			<div className="mk-toolbar">
				<ArrowLeft size={16} aria-hidden />
				<ArrowRight size={16} aria-hidden />
				<RotateCw size={14} aria-hidden />
				<span className="mk-omnibox">
					<Lock size={12} aria-hidden />
					{url}
				</span>
				<Puzzle size={16} aria-hidden />
				<span className="mk-ext-icon" data-open={extensionOpen || undefined}>
					C
				</span>
			</div>
			<div className="mk-viewport">{children}</div>
		</div>
	);
}

/* A plain store product page --------------------------------------------- */

export function StorePage() {
	const store = demoStores[0];
	return (
		<div className="mk-store">
			<div className="mk-store-nav">
				<strong>bestbuy.com</strong>
				<span>TVs</span>
				<span>Computers</span>
				<span>Appliances</span>
				<span className="mk-store-search">Search</span>
			</div>
			<div className="mk-store-body">
				<div className="mk-product-shot" aria-hidden>
					<svg viewBox="0 0 200 130" role="presentation">
						<rect x="8" y="6" width="184" height="104" rx="4" fill="#0f1720" />
						<rect x="14" y="12" width="172" height="92" rx="2" fill="#1d2b38" />
						<path d="M90 110h20l6 12H84z" fill="#0f1720" />
					</svg>
				</div>
				<div className="mk-product-info">
					<span className="mk-crumb">TVs › 65" TVs</span>
					<h3>{store.product.title}</h3>
					<span className="mk-rating">
						{[0, 1, 2, 3, 4].map((i) => (
							<Star key={i} size={12} aria-hidden />
						))}
						<small>4.7 (2,318)</small>
					</span>
					<strong className="mk-price">{usd(store.product.priceUsd)}</strong>
					<span className="mk-button-fake">Add to cart</span>
				</div>
			</div>
		</div>
	);
}

/* Extension popup, three states ------------------------------------------ */

type PopupState = "page" | "consent" | "wallet";

export function Popup({ state }: { state: PopupState }) {
	const store = demoStores[0];
	const { merchant, ranked, query } = runDemo(store);
	const [best, ...rest] = ranked;
	const held = new Set(sampleWallet.map((c) => c.cardId));

	return (
		<div className="mk-popup">
			<div className="mk-popup-head">
				<strong>Cardmax</strong>
				<span className="mk-seg">
					<span data-on={state !== "wallet" || undefined}>This page</span>
					<span data-on={state === "wallet" || undefined}>
						Wallet ({sampleWallet.length})
					</span>
				</span>
			</div>

			{state === "wallet" ? (
				<ul className="mk-popup-cards">
					{catalog.slice(0, 6).map((card) => (
						<li key={card.id}>
							<span
								className="mk-check"
								data-on={held.has(card.id) || undefined}
							/>
							<span>
								<strong>
									{card.issuer} {card.name}
								</strong>
								<small>
									${card.annualFeeUsd} fee · terms checked {card.checkedOn}
								</small>
							</span>
						</li>
					))}
				</ul>
			) : (
				<>
					<div className="mk-popup-merchant">
						<code>{merchant.domain}</code>
						<span className="mk-dot" />
						<span className="mk-popup-cat">
							{merchant.category.replace("_", " ")}
							<ChevronDown size={12} aria-hidden />
						</span>
					</div>
					<div className="mk-popup-winner">
						<small>Pay with</small>
						<strong>{best && cardLabel(best.cardId)}</strong>
						<span>
							<b>+{best && usd(best.estimatedRewardUsd)}</b> {best?.reason} on{" "}
							{usd(store.product.priceUsd)}
						</span>
					</div>
					<ul className="mk-popup-rows">
						{rest.map((r) => (
							<li key={r.cardId}>
								<span>{cardLabel(r.cardId)}</span>
								<span>+{usd(r.estimatedRewardUsd)}</span>
							</li>
						))}
					</ul>
					{state === "consent" ? (
						<div className="mk-payload">
							<small>Sends to api.cardmax.app</small>
							<code>{JSON.stringify(query)}</code>
							<span className="mk-actions">
								<span className="mk-btn mk-btn-primary">Send</span>
								<span className="mk-btn">Cancel</span>
							</span>
						</div>
					) : (
						<div className="mk-popup-foot">
							<span className="mk-btn">Compare at other stores</span>
						</div>
					)}
				</>
			)}
		</div>
	);
}

/* Messages ---------------------------------------------------------------- */

const QUESTIONS = [
	{ text: "which card for whole foods?", domain: "wholefoodsmarket.com" },
	{ text: "doordash?", domain: "doordash.com" },
	{ text: "cvs", domain: "cvs.com" },
	{ text: "target", domain: "target.com" },
];

function answer(domain: string): string {
	const merchant = guessMerchant(domain);
	const [best] = recommend(sampleWallet, catalog, merchant, 100);
	if (!best) return "Add a card first at cardmax.app.";
	const card = catalog.find((c) => c.id === best.cardId);
	const reason = best.reason.replace(/ \(up to .*\)$/, "");
	const worth = card?.rewardCurrency === "points" ? "worth about" : "about";
	return `${cardLabel(best.cardId)}. ${reason}, ${worth} ${usd(best.estimatedRewardUsd)} per $100.`;
}

type Bubble = { from: "me" | "bot"; text: string };

export function Phone() {
	const reduced = usePrefersReducedMotion();
	const [ref, inView] = useInView<HTMLDivElement>(0.4);
	const [thread, setThread] = useState<Bubble[]>([]);
	const [typing, setTyping] = useState(false);
	const [started, setStarted] = useState(false);

	function ask(question: (typeof QUESTIONS)[number]) {
		setThread((t) => [...t, { from: "me", text: question.text }]);
		setTyping(true);
		setTimeout(
			() => {
				setTyping(false);
				setThread((t) => [
					...t,
					{ from: "bot", text: answer(question.domain) },
				]);
			},
			reduced ? 0 : 900,
		);
	}

	useEffect(() => {
		if (!inView || started) return;
		setStarted(true);
		const first = QUESTIONS[0];
		if (first) ask(first);
	});

	return (
		<div ref={ref} className="mk-phone-wrap">
			<div className="mk-phone">
				<div className="mk-phone-head">
					<span className="mk-avatar">C</span>
					<strong>Cardmax</strong>
					<small>iMessage</small>
				</div>
				<div className="mk-phone-thread" aria-live="polite">
					<p className="mk-phone-note">
						Texts pass through Photon and your carrier. Never send card numbers.
					</p>
					{thread.map((bubble, i) => (
						<p
							// biome-ignore lint/suspicious/noArrayIndexKey: append-only thread
							key={i}
							className="mk-bubble"
							data-from={bubble.from}
						>
							{bubble.text}
						</p>
					))}
					{typing && (
						<p
							className="mk-bubble mk-typing"
							data-from="bot"
							aria-label="Typing"
						>
							<i />
							<i />
							<i />
						</p>
					)}
				</div>
				<div className="mk-phone-input">iMessage</div>
			</div>
			<div className="mk-suggestions">
				<small>Try asking</small>
				{QUESTIONS.slice(1).map((q) => (
					<button key={q.text} type="button" onClick={() => ask(q)}>
						{q.text}
					</button>
				))}
			</div>
		</div>
	);
}

/* Web dashboard ----------------------------------------------------------- */

function earns(card: (typeof catalog)[number]): string {
	const unit = card.rewardCurrency === "cash" ? "%" : "x";
	const bonuses = card.rules
		.slice(0, 2)
		.map(
			(r) =>
				`${r.multiplier}${unit} ${r.onlyMerchants?.[0] ?? r.category.replace("_", " ")}`,
		);
	if (!bonuses.length) return `${card.baseMultiplier}${unit} everything`;
	return [...bonuses, `${card.baseMultiplier}${unit} everything else`].join(
		", ",
	);
}

export function Dashboard() {
	const cards = catalog.filter((c) =>
		sampleWallet.some((w) => w.cardId === c.id),
	);
	return (
		<div className="mk-dash">
			<aside>
				<strong>Cardmax</strong>
				<span data-on>Wallet</span>
				<span>Text agent</span>
				<span>Privacy</span>
			</aside>
			<div className="mk-dash-main">
				<div className="mk-dash-head">
					<div>
						<h4>Wallet</h4>
						<small>Synced from Chrome · 2 minutes ago</small>
					</div>
					<span className="mk-btn">Add card</span>
				</div>
				<table>
					<thead>
						<tr>
							<th>Card</th>
							<th>Earns</th>
							<th>Fee</th>
							<th>Terms checked</th>
						</tr>
					</thead>
					<tbody>
						{cards.map((card) => (
							<tr key={card.id}>
								<td>
									{card.issuer} {card.name}
								</td>
								<td>{earns(card)}</td>
								<td>${card.annualFeeUsd}</td>
								<td>{card.checkedOn}</td>
							</tr>
						))}
					</tbody>
				</table>
				<div className="mk-dash-grid">
					<div className="mk-dash-panel">
						<h5>Text agent</h5>
						<p>Linked to •••• 0142</p>
						<small>Messages aren't stored after the reply.</small>
					</div>
					<div className="mk-dash-panel">
						<h5>What our server holds</h5>
						<p>3 card names and your phone number.</p>
						<small>No card numbers, purchases, or browsing.</small>
					</div>
				</div>
			</div>
		</div>
	);
}
