import { createFileRoute } from "@tanstack/react-router";

import {
	Closing,
	Footer,
	Hero,
	HowItWorks,
	Nav,
	PhotoText,
	Privacy,
	WaysIn,
} from "@/components/landing/sections";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{ title: "Pointmaxx: the right card at every checkout" },
			{
				name: "description",
				content:
					"Pointmaxx picks the card that pays you most, wherever you shop.",
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
				<HowItWorks />
				<WaysIn />
				<PhotoText />
				<Privacy />
				<Closing />
			</main>
			<Footer />
		</div>
	);
}
