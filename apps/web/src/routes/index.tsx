import { createFileRoute } from "@tanstack/react-router";

import {
	Closing,
	Footer,
	Hero,
	HowItWorks,
	Issuers,
	Nav,
	PrivacyFaq,
	TextAgent,
} from "@/components/landing/sections";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "Cardmax: the right card, every checkout" },
			{
				name: "description",
				content:
					"Cardmax picks the card in your wallet that pays most at the store you're on. It runs on your device.",
			},
		],
	}),
	component: Landing,
});

function Landing() {
	return (
		<div className="lp">
			<Nav />
			<main>
				<Hero />
				<Issuers />
				<HowItWorks />
				<PrivacyFaq />
				<TextAgent />
				<Closing />
			</main>
			<Footer />
		</div>
	);
}
