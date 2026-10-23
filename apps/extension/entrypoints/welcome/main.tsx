import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import { hasSupportedStores, requestSupportedStores } from "@/lib/permissions";

import { Mark } from "../popup/Mark";

import "./style.css";

// Opened once on install. Chrome only lets the extension see checkout pages on
// sites the user grants, so this asks for the supported stores up front.
function Welcome() {
	const [granted, setGranted] = useState<boolean | null>(null);

	useEffect(() => {
		hasSupportedStores().then(setGranted);
	}, []);

	return (
		<main>
			<h1>
				<Mark size={28} />
				Pointmaxx
			</h1>
			<h2>Open at checkout on supported stores</h2>
			<p>
				Pointmaxx reads the store and the price on checkout pages, on this
				device, and opens with the card that pays you most.
			</p>
			{granted ? (
				<p className="done">
					On. Open a checkout at Best Buy, Target, Walmart or another supported
					store.
				</p>
			) : (
				<button
					type="button"
					onClick={() => requestSupportedStores().then(setGranted)}
				>
					Allow on supported stores
				</button>
			)}
			<p className="note">
				You can turn this off any time from the popup, or allow single sites
				instead.
			</p>
		</main>
	);
}

const root = document.getElementById("root");
if (!root) throw new Error("Welcome root missing");

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<Welcome />
	</React.StrictMode>,
);
