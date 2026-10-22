import { Check } from "lucide-react";

import { cardLabel, demoStores, runDemo, usd } from "./demo-data";
import { Flow } from "./flow";
import { useInView } from "./motion";

const INSTALL_URL = "#install";
const GITHUB_URL = "https://github.com/matmanna/cardmax";

export function Nav() {
	return (
		<header className="lp-nav">
			<span className="lp-wordmark">Cardmax</span>
			<nav>
				<a href={GITHUB_URL}>GitHub</a>
				<a className="lp-button lp-button-ink" href={INSTALL_URL}>
					Add to Chrome
				</a>
			</nav>
		</header>
	);
}

export function Hero() {
	const store = demoStores[0];
	const { merchant, ranked } = runDemo(store);
	const [best, ...rest] = ranked;

	return (
		<section className="lp-hero">
			<div className="lp-hero-copy">
				<h1>The right card, every checkout.</h1>
				<p>
					Cardmax picks the card in your wallet that pays most at the store
					you're on. It runs on your device.
				</p>
				<a className="lp-button" href={INSTALL_URL}>
					Add to Chrome, free
				</a>
			</div>
			<div className="lp-browser" aria-hidden>
				<div className="lp-browser-bar">
					<span className="lp-dots" />
					<span className="lp-url">bestbuy.com/site/sony-65-bravia-7</span>
				</div>
				<div className="lp-browser-page">
					<div className="lp-skeleton-image" />
					<div className="lp-skeleton-text">
						<strong>Sony Bravia 7</strong>
						<strong>{usd(store.product.priceUsd)}</strong>
						<span />
						<span />
					</div>
				</div>
				<div className="lp-popup">
					<div className="lp-popup-head">
						<span className="lp-wordmark">Cardmax</span>
						<span className="lp-pill">This page</span>
					</div>
					<div className="lp-popup-merchant">
						<code>{merchant.domain}</code>
						<span>{merchant.category.replace("_", " ")}</span>
					</div>
					<div className="lp-popup-winner">
						<span>Pay with</span>
						<strong>{best && cardLabel(best.cardId)}</strong>
						<em>
							+{best && usd(best.estimatedRewardUsd)}{" "}
							<small>{best?.reason}</small>
						</em>
					</div>
					<ul>
						{rest.map((r) => (
							<li key={r.cardId}>
								<span>{cardLabel(r.cardId)}</span>
								<span>+{usd(r.estimatedRewardUsd)}</span>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
}

export function Issuers() {
	return (
		<section className="lp-issuers">
			<span>Knows the rules for cards from</span>
			<ul>
				{[
					"Chase",
					"American Express",
					"Citi",
					"Capital One",
					"Wells Fargo",
				].map((name) => (
					<li key={name}>{name}</li>
				))}
			</ul>
		</section>
	);
}

export function HowItWorks() {
	return (
		<section className="lp-section" id="how">
			<div className="lp-section-head">
				<h2>How it works.</h2>
				<p>
					Everything inside the dashed line happens in your browser. Pick a
					store, or click any step.
				</p>
			</div>
			<Flow />
		</section>
	);
}

const PRIVACY = [
	"Never asks for card numbers",
	"Doesn't read your purchases or browsing history",
	"Only opens the page you're on, when you click it",
	"One button stops every send and deletes your data",
];

const FAQ = [
	[
		"How does it know which card wins?",
		"It matches the store's category against each card's bonus rules, read from the issuer's own page. Every card shows the date we last checked its terms.",
	],
	[
		"What if it guesses the store wrong?",
		"Stores don't always code the way you'd expect. Cardmax shows how sure it is, and you can change the category in one tap. It remembers your fix.",
	],
	[
		"Do I need an account?",
		"No. An account only syncs your card list across devices, and only if you turn it on.",
	],
	[
		"Who can read my texts?",
		"Texts go through Photon and your carrier, so they can read them. The bot never asks for amounts or card numbers.",
	],
] as const;

export function PrivacyFaq() {
	return (
		<section className="lp-section lp-split" id="privacy">
			<div>
				<h2>Your wallet stays yours.</h2>
				<ul className="lp-checklist">
					{PRIVACY.map((item) => (
						<li key={item}>
							<Check size={18} aria-hidden />
							{item}
						</li>
					))}
				</ul>
			</div>
			<div className="lp-faq">
				{FAQ.map(([question, answer], i) => (
					<details key={question} open={i === 0}>
						<summary>{question}</summary>
						<p>{answer}</p>
					</details>
				))}
			</div>
		</section>
	);
}

export function TextAgent() {
	const [ref, inView] = useInView<HTMLDivElement>(0.5);
	return (
		<section className="lp-section lp-split lp-center">
			<h2>At the register? Text it.</h2>
			<div ref={ref} className="lp-thread" data-shown={inView || undefined}>
				<p className="lp-bubble lp-bubble-me">which card for whole foods?</p>
				<p className="lp-bubble">
					Amex Gold. 4 points per dollar at US supermarkets.
				</p>
			</div>
		</section>
	);
}

export function Closing() {
	return (
		<section className="lp-closing">
			<h2>Stop guessing at checkout.</h2>
			<a className="lp-button" href={INSTALL_URL}>
				Add to Chrome, free
			</a>
		</section>
	);
}

export function Footer() {
	return (
		<footer className="lp-footer">
			<span>Cardmax</span>
			<nav>
				<a href="#privacy">Privacy</a>
				<a href={GITHUB_URL}>GitHub</a>
			</nav>
		</footer>
	);
}
