import { useCallback, useEffect, useState } from "react";

import { getSettings, getWallet, type Settings } from "@/lib/storage";

import { PageTab } from "./PageTab";
import { WalletTab } from "./WalletTab";

type Tab = "page" | "wallet";

export default function App() {
	const [tab, setTab] = useState<Tab>("page");
	const [wallet, setWalletState] = useState<
		Awaited<ReturnType<typeof getWallet>>
	>([]);
	const [settings, setSettingsState] = useState<Settings | null>(null);

	const reload = useCallback(async () => {
		const [nextWallet, nextSettings] = await Promise.all([
			getWallet(),
			getSettings(),
		]);
		setWalletState(nextWallet);
		setSettingsState(nextSettings);
		if (nextWallet.length === 0) setTab("wallet");
	}, []);

	useEffect(() => {
		reload();
	}, [reload]);

	if (!settings) return null;

	return (
		<main>
			<header>
				<h1>Cardmax</h1>
				<nav>
				<button
					type="button"
					aria-pressed={tab === "page"}
					onClick={() => setTab("page")}
				>
					This page
				</button>
				<button
					type="button"
					aria-pressed={tab === "wallet"}
					onClick={() => setTab("wallet")}
				>
					Wallet ({wallet.length})
				</button>
				</nav>
			</header>
			{tab === "page" ? (
				<PageTab wallet={wallet} settings={settings} onChange={reload} />
			) : (
				<WalletTab wallet={wallet} settings={settings} onChange={reload} />
			)}
		</main>
	);
}
