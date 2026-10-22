import { useCallback, useEffect, useState } from "react";

import { type Catalog, getCatalog } from "@/lib/catalog";
import {
	getLink,
	getSettings,
	getWallet,
	type Link,
	type Settings,
} from "@/lib/storage";

import { Mark } from "./Mark";
import { PageTab } from "./PageTab";
import { WalletTab } from "./WalletTab";

type Tab = "page" | "wallet";

export default function App() {
	const [tab, setTab] = useState<Tab>("page");
	const [wallet, setWalletState] = useState<
		Awaited<ReturnType<typeof getWallet>>
	>([]);
	const [settings, setSettingsState] = useState<Settings | null>(null);
	const [catalog, setCatalog] = useState<Catalog | null>(null);
	const [link, setLinkState] = useState<Link | null>(null);

	const reload = useCallback(async () => {
		const [nextWallet, nextSettings, nextCatalog, nextLink] = await Promise.all(
			[getWallet(), getSettings(), getCatalog(), getLink()],
		);
		setWalletState(nextWallet);
		setSettingsState(nextSettings);
		setCatalog(nextCatalog);
		setLinkState(nextLink);
		if (nextWallet.length === 0) setTab("wallet");
	}, []);

	// Show what's on the device right away, then again after the background
	// pulls the account wallet and catalog.
	useEffect(() => {
		reload();
		browser.runtime
			.sendMessage({ type: "cardmax:pull" })
			.catch(() => {})
			.then(reload);
	}, [reload]);

	if (!settings || !catalog) return null;

	return (
		<main>
			<header>
				<h1>
					<Mark />
					Pointmaxx
				</h1>
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
				<PageTab
					wallet={wallet}
					settings={settings}
					catalog={catalog}
					onChange={reload}
				/>
			) : (
				<WalletTab
					wallet={wallet}
					settings={settings}
					catalog={catalog}
					link={link}
					onChange={reload}
				/>
			)}
		</main>
	);
}
