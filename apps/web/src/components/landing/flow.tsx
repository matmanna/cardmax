import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { cardLabel, demoStores, rate, runDemo, usd } from "./demo-data";
import { useInView, usePrefersReducedMotion } from "./motion";

const STEPS = [
	{
		key: "cards",
		caption: "Your cards are saved as names, picked from a list.",
	},
	{
		key: "store",
		caption: "Cardmax reads the store and price from the page you're on.",
	},
	{
		key: "match",
		caption: "It checks each card's bonus categories, caps, and exclusions.",
	},
	{
		key: "result",
		caption:
			"You get the winner and the reason. Nothing has left your browser.",
	},
	{
		key: "compare",
		caption: "Want other prices? Click Compare. You see the payload first.",
	},
	{
		key: "payload",
		caption:
			"Only the product code goes out. No cards, no history, no account.",
	},
	{
		key: "retailers",
		caption:
			"Listings come back ranked by price minus your best card's reward.",
	},
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const STEP_MS = 2200;

function stateOf(step: number, index: number) {
	if (index === step) return "active";
	return index < step ? "done" : "todo";
}

function Edge({
	step,
	into,
	dashed,
}: {
	step: number;
	into: number;
	dashed?: boolean;
}) {
	return (
		<span
			aria-hidden
			className="lp-edge"
			data-state={stateOf(step, into)}
			data-dashed={dashed || undefined}
		>
			<span className="lp-edge-dot" />
		</span>
	);
}

export function Flow() {
	const reduced = usePrefersReducedMotion();
	const [ref, inView] = useInView<HTMLDivElement>();
	const [storeIndex, setStoreIndex] = useState(0);
	const [step, setStep] = useState(0);
	const [playing, setPlaying] = useState(true);

	const store = demoStores[storeIndex] ?? demoStores[0];
	const { merchant, ranked, query } = runDemo(store);
	const [best] = ranked;
	const auto = playing && !reduced && inView;

	useEffect(() => {
		if (!auto) return;
		const timer = setInterval(
			() => setStep((current) => (current + 1) % STEPS.length),
			STEP_MS,
		);
		return () => clearInterval(timer);
	}, [auto]);

	function pick(key: StepKey) {
		setStep(STEPS.findIndex((s) => s.key === key));
		setPlaying(false);
	}

	function node(key: StepKey) {
		const index = STEPS.findIndex((s) => s.key === key);
		return {
			type: "button" as const,
			className: "lp-node",
			"data-state": stateOf(step, index),
			"aria-pressed": step === index,
			onClick: () => pick(key),
		};
	}

	return (
		<div ref={ref} className="lp-flow">
			<div className="lp-flow-controls">
				<fieldset className="lp-chips">
					<legend className="lp-sr-only">Store</legend>
					{demoStores.map((s, i) => (
						<button
							key={s.domain}
							type="button"
							className="lp-chip"
							aria-pressed={i === storeIndex}
							onClick={() => {
								setStoreIndex(i);
								setStep(0);
							}}
						>
							{s.label}
						</button>
					))}
				</fieldset>
				<button
					type="button"
					className="lp-icon-button"
					aria-label={playing ? "Pause" : "Play"}
					onClick={() => setPlaying((p) => !p)}
				>
					{playing ? <Pause size={16} /> : <Play size={16} />}
				</button>
			</div>

			<div className="lp-device">
				<span className="lp-device-label">your browser</span>
				<div className="lp-inputs">
					<button {...node("cards")}>
						<strong>Your cards</strong>
						<span>Citi Double Cash, Chase Freedom Unlimited, Amex Gold</span>
					</button>
					<button {...node("store")}>
						<strong>{merchant.domain}</strong>
						<span>
							{store.product.title}, {usd(store.product.priceUsd)}
						</span>
					</button>
				</div>
				<Edge step={step} into={2} />
				<button {...node("match")} data-wide>
					<strong>Match against card terms</strong>
					<span>
						Codes as {merchant.category.replace("_", " ")}.{" "}
						{ranked
							.map(
								(r) => `${cardLabel(r.cardId)} ${rate(r.cardId, r.multiplier)}`,
							)
							.join(" · ")}
					</span>
				</button>
				<Edge step={step} into={3} />
				<button {...node("result")} data-result>
					<strong>Pay with {best ? cardLabel(best.cardId) : "…"}</strong>
					<span>
						+{best ? usd(best.estimatedRewardUsd) : "$0.00"}, {best?.reason}
					</span>
				</button>
			</div>

			<div className="lp-branch">
				<button {...node("compare")}>
					<strong>You click Compare</strong>
					<span>You see the exact payload first</span>
				</button>
				<Edge step={step} into={5} dashed />
				<button {...node("payload")} data-wide data-code>
					{query ? (
						<code>{JSON.stringify(query)}</code>
					) : (
						<span>No single product here, so nothing is sent</span>
					)}
				</button>
				<Edge step={step} into={6} dashed />
				<button {...node("retailers")}>
					<strong>Best Buy and Walmart</strong>
					<span>Ranked by price minus your reward</span>
				</button>
			</div>

			<p className="lp-caption" aria-live="polite">
				<span className="lp-caption-step">
					{String(step + 1).padStart(2, "0")}
				</span>
				{STEPS[step]?.caption}
			</p>
		</div>
	);
}
