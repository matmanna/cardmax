import { Check } from "lucide-react";
import { useState } from "react";

import { Flow } from "./flow";
import { Mark } from "./mark";
import { BrowserFrame, Dashboard, Phone, Popup, StorePage } from "./mocks";

const INSTALL_URL = "#install";
const GITHUB_URL = "https://github.com/matmanna/cardmax";

export function Nav() {
	return (
		<header className="lp-nav">
			<span className="lp-wordmark">
				<Mark />
				Cardmax
			</span>
			<nav>
				<a href="#product">Product</a>
				<a href="#how">How it works</a>
				<a href="#privacy">Privacy</a>
				<a href={GITHUB_URL}>GitHub</a>
				<a className="lp-button lp-button-small" href={INSTALL_URL}>
					Add to Chrome
				</a>
			</nav>
		</header>
	);
}

export function Hero() {
	return (
		<section className="lp-hero">
			<div className="lp-hero-copy">
				<h1>Know which card to use at every checkout.</h1>
				<p>
					Cardmax looks at the store you're on and the cards you carry, then
					tells you which one earns the most. The math runs in your browser.
				</p>
				<div className="lp-hero-actions">
					<a className="lp-button" href={INSTALL_URL}>
						Add to Chrome, free
					</a>
					<a className="lp-link" href="#product">
						See the app
					</a>
				</div>
				<p className="lp-issuers">
					Works with cards from Chase, American Express, Citi, Capital One, and
					Wells Fargo.
				</p>
			</div>
			<div className="lp-hero-shot">
				<BrowserFrame
					url="bestbuy.com/site/sony-65-bravia-7"
					title={'Sony 65" Bravia 7 – Best Buy'}
					extensionOpen
				>
					<StorePage />
					<div className="lp-hero-popup">
						<Popup state="page" />
					</div>
				</BrowserFrame>
			</div>
		</section>
	);
}

const SURFACES = [
	{
		key: "extension",
		label: "Chrome extension",
		title: "Open it on any store page.",
		body: "The popup reads the store and price, ranks your cards, and shows why. Comparing prices elsewhere is one click, and you see the exact request first.",
	},
	{
		key: "messages",
		label: "Text messages",
		title: "Ask from the checkout line.",
		body: "Text the store name and get the card back. Link your phone once from the dashboard. Try the buttons under the phone.",
	},
	{
		key: "dashboard",
		label: "Web dashboard",
		title: "Your wallet, synced.",
		body: "Sign in to sync your card list between browsers and link a phone. The server holds card names and a phone number. Nothing else.",
	},
] as const;

type SurfaceKey = (typeof SURFACES)[number]["key"];

export function Product() {
	const [active, setActive] = useState<SurfaceKey>("extension");
	const surface = SURFACES.find((s) => s.key === active) ?? SURFACES[0];

	return (
		<section className="lp-section" id="product">
			<div className="lp-tabs" role="tablist" aria-label="Product">
				{SURFACES.map((s) => (
					<button
						key={s.key}
						type="button"
						role="tab"
						id={`tab-${s.key}`}
						aria-selected={s.key === active}
						aria-controls="surface-panel"
						onClick={() => setActive(s.key)}
					>
						{s.label}
					</button>
				))}
			</div>
			<div
				className="lp-surface"
				id="surface-panel"
				role="tabpanel"
				aria-labelledby={`tab-${active}`}
			>
				<div className="lp-surface-copy">
					<h2>{surface.title}</h2>
					<p>{surface.body}</p>
				</div>
				<div className="lp-surface-shot" key={active}>
					{active === "extension" && (
						<div className="lp-popups">
							<Popup state="page" />
							<Popup state="consent" />
							<Popup state="wallet" />
						</div>
					)}
					{active === "messages" && <Phone />}
					{active === "dashboard" && (
						<BrowserFrame url="cardmax.app/wallet" title="Wallet – Cardmax">
							<Dashboard />
						</BrowserFrame>
					)}
				</div>
			</div>
		</section>
	);
}

export function HowItWorks() {
	return (
		<section className="lp-section" id="how">
			<div className="lp-section-head">
				<h2>How a pick is made</h2>
				<p>
					Everything inside the dashed line runs in your browser. Pick a store,
					or click any step.
				</p>
			</div>
			<Flow />
		</section>
	);
}

const PRIVACY = [
	"Never asks for card numbers",
	"Doesn't read your purchases or browsing history",
	"Only reads the page you're on, when you open it",
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
		"No. An account only syncs your card list and links a phone, and only if you turn it on.",
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
				<h2>What stays private</h2>
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

export function Footer() {
	return (
		<footer className="lp-footer">
			<div className="lp-footer-cta">
				<h2>Try it on your next order.</h2>
				<a className="lp-button" href={INSTALL_URL}>
					Add to Chrome, free
				</a>
			</div>
			<div className="lp-footer-bar">
				<span className="lp-wordmark lp-wordmark-small">
					<Mark size={16} />
					Cardmax
				</span>
				<nav>
					<a href="#privacy">Privacy</a>
					<a href={GITHUB_URL}>GitHub</a>
				</nav>
			</div>
		</footer>
	);
}
