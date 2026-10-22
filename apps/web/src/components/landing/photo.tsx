import { useEffect, useRef, useState } from "react";

import { answer } from "./mocks";
import { useInView, usePrefersReducedMotion } from "./motion";

const STOREFRONTS = [
	{
		name: "Whole Foods",
		sign: "WHOLE FOODS MARKET",
		color: "#2f5d3a",
		domain: "wholefoodsmarket.com",
	},
	{ name: "CVS", sign: "CVS pharmacy", color: "#c8102e", domain: "cvs.com" },
	{ name: "Target", sign: "TARGET", color: "#cc0000", domain: "target.com" },
] as const;

type Storefront = (typeof STOREFRONTS)[number];

function Storefront({ store }: { store: Storefront }) {
	return (
		<svg
			viewBox="0 0 220 140"
			role="img"
			aria-label={`Photo of a ${store.name} storefront`}
			className="lp-shot"
		>
			<rect width="220" height="140" fill="#c9d3dc" />
			<rect y="104" width="220" height="36" fill="#8e9aa6" />
			<rect x="22" y="40" width="176" height="68" fill="#ece7da" />
			<rect x="22" y="40" width="176" height="22" fill={store.color} />
			<text
				x="110"
				y="55"
				textAnchor="middle"
				fontSize="10"
				fontWeight="600"
				fill="#ffffff"
				fontFamily="system-ui, sans-serif"
			>
				{store.sign}
			</text>
			<rect x="38" y="70" width="52" height="38" fill="#5d6b7a" />
			<rect x="104" y="72" width="76" height="28" fill="#a7b6c4" />
		</svg>
	);
}

type Stage = "idle" | "sent" | "reading" | "reply";

// A storefront photo going through the text agent, one stage at a time.
export function PhotoDemo() {
	const reduced = usePrefersReducedMotion();
	const [ref, inView] = useInView<HTMLDivElement>(0.5);
	const [store, setStore] = useState<Storefront>(STOREFRONTS[0]);
	const [stage, setStage] = useState<Stage>("idle");
	const started = useRef(false);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

	function send(next: Storefront) {
		for (const t of timers.current) clearTimeout(t);
		setStore(next);
		if (reduced) {
			setStage("reply");
			return;
		}
		setStage("sent");
		timers.current = [
			setTimeout(() => setStage("reading"), 700),
			setTimeout(() => setStage("reply"), 1800),
		];
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: send once, the first time it is watched
	useEffect(() => {
		if (!inView || started.current) return;
		started.current = true;
		send(STOREFRONTS[0]);
	}, [inView]);

	useEffect(() => {
		const pending = timers.current;
		return () => {
			for (const t of pending) clearTimeout(t);
		};
	}, []);

	const reply = `Looks like ${store.name}. ${answer(store.domain)}`;

	return (
		<div ref={ref} className="lp-photo">
			<div className="lp-photo-phone">
				<div className="lp-photo-thread" aria-live="polite">
					{stage !== "idle" && (
						<div className="lp-photo-me" key={store.name}>
							<Storefront store={store} />
						</div>
					)}
					{stage === "reading" && (
						<p className="mk-bubble mk-typing" data-from="bot">
							<span className="lp-sr-only">Reading the sign</span>
							<i />
							<i />
							<i />
						</p>
					)}
					{stage === "reply" && (
						<p className="mk-bubble" data-from="bot" key={reply}>
							{reply}
						</p>
					)}
				</div>
			</div>
			<fieldset className="lp-chips lp-photo-chips">
				<legend className="lp-chips-label">Send a photo of:</legend>
				{STOREFRONTS.map((s) => (
					<button
						key={s.name}
						type="button"
						className="lp-chip"
						aria-pressed={s.name === store.name && stage !== "idle"}
						onClick={() => send(s)}
					>
						{s.name}
					</button>
				))}
			</fieldset>
		</div>
	);
}
