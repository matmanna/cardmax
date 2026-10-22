import { useEffect, useState } from "react";
import { Phone, Popup } from "./mocks";
import { useInView, usePrefersReducedMotion } from "./motion";

const STEPS = [
	{
		title: "Add your cards",
		body: "Pick the cards you carry from a list.",
	},
	{
		title: "Open a store",
		body: "It reads the store and price and ranks your cards.",
	},
	{
		title: "Compare prices",
		body: "One click, and you see exactly what's sent first.",
	},
	{
		title: "Or just text it",
		body: "Send a store name or a photo of the storefront.",
	},
] as const;

const stepMs = 5200;

function Device({ step }: { step: number }) {
	if (step === 0) return <Popup state="wallet" />;
	if (step === 1) return <Popup state="page" />;
	if (step === 2) return <Popup state="consent" />;
	return <Phone />;
}

// One device that changes as the steps advance. Autoplays while on screen and
// stops for good once the visitor picks a step.
export function Steps() {
	const reduced = usePrefersReducedMotion();
	const [ref, inView] = useInView<HTMLDivElement>(0.35);
	const [step, setStep] = useState(1);
	const [picked, setPicked] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: step restarts the timer for each step
	useEffect(() => {
		if (picked || reduced || !inView) return;
		const timer = setTimeout(
			() => setStep((s) => (s + 1) % STEPS.length),
			stepMs,
		);
		return () => clearTimeout(timer);
	}, [step, picked, reduced, inView]);

	const playing = !picked && !reduced && inView;

	return (
		<div ref={ref} className="lp-steps">
			<div className="lp-steps-copy">
				<h2>How it works</h2>
				<ol aria-label="How it works">
					{STEPS.map((s, i) => (
						<li key={s.title} data-active={i === step || undefined}>
							<button
								type="button"
								aria-current={i === step || undefined}
								onClick={() => {
									setStep(i);
									setPicked(true);
								}}
							>
								<span className="lp-step-title">
									<span className="lp-step-num">
										{String(i + 1).padStart(2, "0")}
									</span>
									{s.title}
								</span>
								{i === step && <span className="lp-step-body">{s.body}</span>}
							</button>
							{i === step && (
								<span
									className="lp-step-bar"
									key={`${step}-${playing}`}
									data-playing={playing || undefined}
									style={{ animationDuration: `${stepMs}ms` }}
								/>
							)}
						</li>
					))}
				</ol>
			</div>
			<div className="lp-device">
				<div className="lp-device-pane" key={step}>
					<Device step={step} />
				</div>
			</div>
		</div>
	);
}
