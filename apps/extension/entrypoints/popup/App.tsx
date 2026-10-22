import { useCallback, useEffect, useState } from "react";

import { type Catalog, getCatalog } from "@/lib/catalog";
import { readActiveTab } from "@/lib/page";
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
	const [tab, setTab] = useState<Tab | null>(null);
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
		return nextWallet;
	}, []);

	// Show what's on the device right away, then again after the background
	// pulls the account wallet and catalog. The starting tab is picked once,
	// from the first load; after that only the user's clicks change it.
	useEffect(() => {
		Promise.all([reload(), readActiveTab().catch(() => null)]).then(
			([nextWallet, page]) =>
				setTab((current) => {
					if (current) return current;
					return !page && nextWallet.length === 0 ? "wallet" : "page";
				}),
		);
		browser.runtime
			.sendMessage({ type: "cardmax:pull" })
			.catch(() => {})
			.then(reload);
	}, [reload]);

	if (!settings || !catalog || !tab) return null;

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
					onOpenWallet={() => setTab("wallet")}
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
