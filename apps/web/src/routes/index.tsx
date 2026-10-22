import { createFileRoute } from "@tanstack/react-router";

import {
	Footer,
	Hero,
	HowItWorks,
	Nav,
	PrivacyFaq,
	Product,
} from "@/components/landing/sections";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "Cardmax: know which card to use at every checkout" },
			{
				name: "description",
				content:
					"Cardmax looks at the store you're on and the cards you carry, then tells you which one earns the most. The math runs in your browser.",
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
				<Product />
				<HowItWorks />
				<PrivacyFaq />
			</main>
			<Footer />
		</div>
	);
}
