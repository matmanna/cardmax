import { useEffect, useRef, useState } from "react";

import { cardLabel, heroStores, pickFor, usd } from "./demo-data";
import { useInView, usePrefersReducedMotion } from "./motion";

const cycleMs = 4200;

// Eases a number toward its target, so the reward ticks instead of jumping.
function useCountUp(target: number, enabled: boolean): number {
	const [value, setValue] = useState(target);
	const from = useRef(target);
	useEffect(() => {
		if (!enabled) {
			setValue(target);
			from.current = target;
			return;
		}
		const start = performance.now();
		const begin = from.current;
		let frame = 0;
		const tick = (now: number) => {
			const t = Math.min(1, (now - start) / 450);
			const eased = 1 - (1 - t) ** 3;
			const next = begin + (target - begin) * eased;
			setValue(next);
			from.current = next;
			if (t < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target, enabled]);
	return value;
}

export function HeroDemo() {
	const reduced = usePrefersReducedMotion();
	const [ref, inView] = useInView<HTMLDivElement>(0.4);
	const [index, setIndex] = useState(0);
	const [picked, setPicked] = useState(false);

	// Cycles through stores until the visitor picks one, and only while on screen.
	useEffect(() => {
		if (picked || reduced || !inView) return;
		const timer = setInterval(
			() => setIndex((i) => (i + 1) % heroStores.length),
			cycleMs,
		);
		return () => clearInterval(timer);
	}, [picked, reduced, inView]);

	const store = heroStores[index] ?? heroStores[0];
	const { best, rest } = pickFor(store.domain, store.amount);
	const topReward = best?.estimatedRewardUsd || 1;
	const reward = useCountUp(best?.estimatedRewardUsd ?? 0, !reduced);

	return (
		<div ref={ref} className="lp-demo">
			<fieldset className="lp-chips">
				<legend className="lp-chips-label">Find the best card for:</legend>
				{heroStores.map((s, i) => (
					<button
						key={s.domain}
						type="button"
						className="lp-chip"
						aria-pressed={i === index}
						onClick={() => {
							setIndex(i);
							setPicked(true);
						}}
					>
						{s.label}
					</button>
				))}
			</fieldset>
			<div className="lp-window">
				<div className="lp-window-bar">
					<span className="lp-dots" aria-hidden />
					<span className="lp-url">
						{store.domain}
						{store.path}
					</span>
				</div>
				<div className="lp-pick" key={store.domain} aria-live="polite">
					<span className="lp-pick-top">
						<span className="lp-pick-label">Pay with</span>
						<span className="lp-pick-tag">
							{store.label} · {store.path === "/cart" ? "cart" : "checkout"}
						</span>
					</span>
					<strong className="lp-pick-card">
						{best ? cardLabel(best.cardId) : ""}
					</strong>
					<span className="lp-pick-reward">
						<b>+{usd(reward)}</b>
						<span>
							{best?.reason.replace(/ \(up to .*\)$/, "")} · {usd(store.amount)}
						</span>
					</span>
				</div>
				<ul className="lp-rows">
					{rest.map((card) => (
						<li key={card.cardId}>
							<span>{cardLabel(card.cardId)}</span>
							<span className="lp-rows-bar" aria-hidden>
								<i
									style={{
										width: `${Math.max(8, (card.estimatedRewardUsd / topReward) * 100)}%`,
									}}
								/>
							</span>
							<span>+{usd(card.estimatedRewardUsd)}</span>
						</li>
					))}
				</ul>
				<div className="lp-window-foot">
					<span>Compared on this device</span>
					<span>{rest.length + 1} cards</span>
				</div>
			</div>
		</div>
	);
}
