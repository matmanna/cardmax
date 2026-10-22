import { ArrowRight } from "lucide-react";

import { HeroDemo } from "./hero-demo";
import { Mark } from "./mark";
import { Reveal } from "./reveal";
import { Steps } from "./steps";

const INSTALL_URL = "#install";
const GITHUB_URL = "https://github.com/matmanna/cardmax";

export function Nav() {
	return (
		<header className="lp-nav">
			<span className="lp-wordmark">
				<Mark />
				Pointmaxx
			</span>
			<nav>
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
				<h1>The right card at every checkout.</h1>
				<p>Pointmaxx picks the card that pays you most, wherever you shop.</p>
				<div className="lp-hero-actions">
					<a className="lp-button" href={INSTALL_URL}>
						Add to Chrome
						<ArrowRight size={16} aria-hidden className="lp-arrow" />
					</a>
					<a className="lp-link" href="#how">
						See how it works
					</a>
				</div>
			</div>
			<HeroDemo />
		</section>
	);
}

export function HowItWorks() {
	return (
		<section className="lp-section" id="how">
			<Reveal>
				<Steps />
			</Reveal>
		</section>
	);
}

export function Privacy() {
	return (
		<section className="lp-section" id="privacy">
			<Reveal>
				<h2>Your cards stay yours.</h2>
				<div className="lp-facts">
					<div data-accent>
						<span>On your device</span>
						<p>The math, your cards, and every store you visit.</p>
					</div>
					<div>
						<span>Only when you click</span>
						<code>{'{ "upc": "027242925694" }'}</code>
					</div>
					<div>
						<span>Never</span>
						<p>Card numbers, purchases, or browsing history.</p>
					</div>
				</div>
			</Reveal>
		</section>
	);
}

export function Closing() {
	return (
		<section className="lp-section lp-closing" id="install">
			<Reveal className="lp-closing-row">
				<h2>Try it on your next order.</h2>
				<a className="lp-button" href={INSTALL_URL}>
					Add to Chrome
					<ArrowRight size={16} aria-hidden className="lp-arrow" />
				</a>
			</Reveal>
		</section>
	);
}

export function Footer() {
	return (
		<footer className="lp-footer">
			<div className="lp-footer-bar">
				<span className="lp-wordmark lp-wordmark-small">
					<Mark size={16} />
					Pointmaxx
				</span>
				<nav>
					<a href="#privacy">Privacy</a>
					<a href={GITHUB_URL}>GitHub</a>
				</nav>
			</div>
		</footer>
	);
}
