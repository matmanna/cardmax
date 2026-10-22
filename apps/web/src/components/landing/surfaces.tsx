import { catalog } from "@cardmax/core";
import { ArrowRight } from "lucide-react";
import { cardLabel, sampleWallet } from "./demo-data";
import { answer, Popup } from "./mocks";

function Extension() {
	return (
		<div className="lp-surface-mock">
			<Popup state="page" />
		</div>
	);
}

function Texts() {
	return (
		<div className="lp-surface-mock">
			<div className="lp-sms">
				<p className="mk-bubble" data-from="me">
					whole foods
				</p>
				<p className="mk-bubble" data-from="bot">
					{answer("wholefoodsmarket.com")}
				</p>
			</div>
		</div>
	);
}

function WebApp() {
	return (
		<div className="lp-surface-mock">
			<div className="lp-app">
				<div className="lp-app-bar">
					<span className="lp-dots" aria-hidden />
					<span className="lp-url">pointmaxx.ing/sync</span>
				</div>
				<div className="lp-app-body">
					<div className="lp-app-head">
						<strong>Wallet</strong>
						<span className="lp-synced">
							<i aria-hidden />
							Connected to Chrome
						</span>
					</div>
					<ul>
						{sampleWallet.map((card) => (
							<li key={card.cardId}>
								<span>{cardLabel(card.cardId)}</span>
								<span>
									$
									{catalog.find((c) => c.id === card.cardId)?.annualFeeUsd ?? 0}{" "}
									fee
								</span>
							</li>
						))}
					</ul>
					<div className="lp-app-foot">Phone linked · ••• 0142</div>
				</div>
			</div>
		</div>
	);
}

const SURFACES = [
	{
		title: "Chrome extension",
		body: "Opens at checkout with the best card and why.",
		mock: <Extension />,
		where: "Chrome",
		href: "#install",
		cta: "Add to Chrome",
	},
	{
		title: "Text agent",
		body: "Text a store name or a storefront photo. Works on any phone.",
		mock: <Texts />,
		where: "pointmaxx.ing/texts",
		href: "/texts",
		cta: "Link your phone",
	},
	{
		title: "Web app",
		body: "Sign in to sync your wallet and link your phone.",
		mock: <WebApp />,
		where: "pointmaxx.ing",
		href: "/login",
		cta: "Sign in",
	},
] as const;

export function Surfaces() {
	return (
		<div className="lp-surfaces">
			{SURFACES.map((s) => (
				<article key={s.title}>
					{s.mock}
					<span className="lp-where">{s.where}</span>
					<h3>{s.title}</h3>
					<p>{s.body}</p>
					<a className="lp-link" href={s.href}>
						{s.cta}
						<ArrowRight size={14} aria-hidden />
					</a>
				</article>
			))}
		</div>
	);
}
