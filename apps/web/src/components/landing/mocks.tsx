import { catalog, guessMerchant, recommend } from "@cardmax/core";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { cardLabel, demoStores, runDemo, sampleWallet, usd } from "./demo-data";
import { Mark } from "./mark";
import { useInView, usePrefersReducedMotion } from "./motion";

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
				<strong>
					<Mark size={18} />
					Pointmaxx
				</strong>
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
							<small>Sends to pointmaxx.ing</small>
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
	if (!best) return "Add a card first at pointmaxx.ing.";
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
					<span className="mk-avatar">
						<Mark size={36} />
					</span>
					<strong>Pointmaxx</strong>
					<small>iMessage</small>
				</div>
				<div className="mk-phone-thread" aria-live="polite">
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
						<p className="mk-bubble mk-typing" data-from="bot">
							<span className="lp-sr-only">Typing</span>
							<i />
							<i />
							<i />
						</p>
					)}
				</div>
				<div className="mk-phone-input">iMessage</div>
			</div>
			<div className="mk-suggestions">
				{QUESTIONS.slice(1).map((q) => (
					<button key={q.text} type="button" onClick={() => ask(q)}>
						{q.text}
					</button>
				))}
			</div>
		</div>
	);
}
