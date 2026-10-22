import { ArrowRight } from "lucide-react";

import { HeroDemo } from "./hero-demo";
import { Mark } from "./mark";
import { PhotoDemo } from "./photo";
import { Reveal } from "./reveal";
import { Steps } from "./steps";
import { Surfaces } from "./surfaces";

const INSTALL_URL = "#install";
const GITHUB_URL = "https://github.com/matmanna/pointmaxx";

export function Nav() {
	return (
		<header className="lp-nav">
			<span className="lp-wordmark">
				<Mark />
				Pointmaxx
			</span>
			<nav>
				<a href="#how">How it works</a>
				<a href="#ways">Web app</a>
				<a href="#privacy">Privacy</a>
				<a href={GITHUB_URL}>GitHub</a>
				<a href="/login">Sign in</a>
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
					<a className="lp-link" href="/login">
						Sign in to the web app
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

export function WaysIn() {
	return (
		<section className="lp-section" id="ways">
			<Reveal>
				<h2>One wallet, three ways in.</h2>
				<Surfaces />
			</Reveal>
		</section>
	);
}

export function PhotoText() {
	return (
		<section className="lp-section" id="photo">
			<Reveal className="lp-photo-row">
				<div className="lp-photo-copy">
					<h2>Standing outside? Send a photo.</h2>
					<p>
						Snap the storefront and text it. Pointmaxx reads the sign and
						replies with the card to use.
					</p>
					<ol>
						<li>
							<span>01</span>Location data is stripped from the photo
						</li>
						<li>
							<span>02</span>The store name is read from the sign
						</li>
						<li>
							<span>03</span>The photo is deleted after the reply
						</li>
					</ol>
				</div>
				<PhotoDemo />
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
				<div className="lp-hero-actions">
					<a className="lp-button" href={INSTALL_URL}>
						Add to Chrome
						<ArrowRight size={16} aria-hidden className="lp-arrow" />
					</a>
					<a className="lp-link" href="/login">
						Create an account
					</a>
				</div>
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
					<a href="/login">Sign in</a>
					<a href={GITHUB_URL}>GitHub</a>
				</nav>
			</div>
		</footer>
	);
}
