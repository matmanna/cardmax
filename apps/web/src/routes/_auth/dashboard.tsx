import {
	catalog as bundledCatalog,
	type CardProduct,
	type Category,
	guessMerchant,
	recommend,
	type WalletCard,
} from "@cardmax/core";
import { Button } from "@cardmax/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Page, PageHeader, Panel } from "@/components/platform/page";
import { ENV } from "@/env";
import { sendToExtension } from "@/lib/extension";
import { orpc } from "@/utils/orpc";

// Paper: Platform › "05 Wallet".
export const Route = createFileRoute("/_auth/dashboard")({
	component: RouteComponent,
});

const categoryLabels: Record<Category, string> = {
	dining: "dining",
	grocery: "US supermarkets",
	gas: "gas",
	travel: "travel",
	streaming: "streaming",
	drugstore: "drugstore",
	online_retail: "online retail",
	warehouse_club: "warehouse clubs",
	other: "other",
};

function rate(card: CardProduct, multiplier: number) {
	return card.rewardCurrency === "cash" ? `${multiplier}%` : `${multiplier}x`;
}

// "3% dining, 3% drugstore, 1.5% everything else". Store-only rules read
// "5% at target.com", and a 0% base is left out.
function earns(card: CardProduct) {
	const parts = card.rules.map((rule) =>
		rule.onlyMerchants
			? `${rate(card, rule.multiplier)} at ${rule.onlyMerchants.join(", ")}`
			: `${rate(card, rule.multiplier)} ${categoryLabels[rule.category]}`,
	);
	if (card.baseMultiplier > 0)
		parts.push(
			`${rate(card, card.baseMultiplier)} everything${parts.length ? " else" : ""}`,
		);
	return parts.join(", ");
}

function fee(card: CardProduct) {
	return `$${card.annualFeeUsd}`;
}

const stores = [
	{ label: "Best Buy", domain: "bestbuy.com", amount: 1199.99 },
	{ label: "Target", domain: "target.com", amount: 64.2 },
	{ label: "Walmart", domain: "walmart.com", amount: 112.5 },
	{ label: "Whole Foods", domain: "wholefoodsmarket.com", amount: 86.4 },
	{ label: "DoorDash", domain: "doordash.com", amount: 42.18 },
	{ label: "CVS", domain: "cvs.com", amount: 31.75 },
] as const;

const usd = (value: number) =>
	value.toLocaleString("en-US", { style: "currency", currency: "USD" });

function BestCardAt({
	owned,
	products,
}: {
	owned: WalletCard[];
	products: CardProduct[];
}) {
	const [index, setIndex] = useState(0);
	const store = stores[index] ?? stores[0];
	const ranked = recommend(
		owned,
		products,
		guessMerchant(store.domain),
		store.amount,
	);
	const [best, ...rest] = ranked;
	const name = (cardId: string) => {
		const card = products.find((item) => item.id === cardId);
		return card ? cardLabel(card) : cardId;
	};

	return (
		<Panel
			title="Best card at"
			tone="muted"
			action={
				<div className="flex flex-wrap gap-1.5 md:justify-end">
					{stores.map((item, i) => (
						<button
							key={item.domain}
							type="button"
							aria-pressed={i === index}
							onClick={() => setIndex(i)}
							className="bg-background text-foreground aria-pressed:bg-foreground aria-pressed:text-background rounded-full px-2.5 py-1 text-[13px] leading-[18px]"
						>
							{item.label}
						</button>
					))}
				</div>
			}
		>
			{best && (
				<div className="bg-background flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-(--brand) px-3.5 py-3">
					<div>
						<div className="text-sm leading-5 font-semibold">
							{name(best.cardId)}
						</div>
						<div className="text-muted-foreground text-[13px] leading-[18px]">
							{best.reason}
						</div>
					</div>
					<div className="text-right text-sm leading-5 font-semibold text-(--brand-ink)">
						{usd(best.estimatedRewardUsd)} on {usd(store.amount)}
					</div>
				</div>
			)}
			{rest.length > 0 && (
				<ul className="divide-border divide-y px-3.5">
					{rest.map((item) => (
						<li
							key={item.cardId}
							className="flex justify-between gap-4 py-2 text-[13px] leading-[18px]"
						>
							<span>{name(item.cardId)}</span>
							<span className="text-muted-foreground">
								{usd(item.estimatedRewardUsd)}
							</span>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}

const cardLabel = (card: CardProduct) => `${card.issuer} ${card.name}`;

function RouteComponent() {
	const queryClient = useQueryClient();
	const account = useQuery(orpc.wallet.get.queryOptions());
	const remote = useQuery(orpc.catalog.list.queryOptions());
	const products = remote.data?.cards ?? bundledCatalog;
	const byId = useMemo(
		() => new Map(products.map((card) => [card.id, card])),
		[products],
	);

	const owned: WalletCard[] = account.data?.cards ?? [];
	const ownedCards = owned.flatMap((entry) => byId.get(entry.cardId) ?? []);

	const save = useMutation(
		orpc.wallet.put.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: orpc.wallet.get.key() }),
			onError: (error) => toast.error(error.message),
		}),
	);

	const [picking, setPicking] = useState(false);
	const [query, setQuery] = useState("");
	const available = products.filter(
		(card) =>
			!owned.some((entry) => entry.cardId === card.id) &&
			cardLabel(card).toLowerCase().includes(query.trim().toLowerCase()),
	);

	const add = (card: CardProduct) =>
		save.mutate([
			...owned,
			{ cardId: card.id, addedAt: new Date().toISOString() },
		]);
	const remove = (cardId: string) =>
		save.mutate(owned.filter((entry) => entry.cardId !== cardId));

	const chrome = useChromeStatus(owned);
	const phone = useQuery(orpc.phone.status.queryOptions());
	const linkCode = useMutation(
		orpc.phone.createLinkCode.mutationOptions({
			onError: (error) => toast.error(error.message),
		}),
	);

	const count = `${ownedCards.length} ${ownedCards.length === 1 ? "card" : "cards"}`;

	return (
		<Page>
			<PageHeader
				title="Wallet"
				subtitle={chrome === "synced" ? `${count} · synced with Chrome` : count}
				action={
					<Button
						type="button"
						className="h-9 rounded-lg px-3.5 text-sm"
						onClick={() => setPicking((open) => !open)}
					>
						{picking ? "Done" : "Add card"}
					</Button>
				}
			/>

			{picking && (
				<Panel title="Add a card">
					<input
						className="bg-background h-9 rounded-lg border px-3 text-sm"
						placeholder="Search cards"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
					<ul className="divide-y">
						{available.map((card) => (
							<li
								key={card.id}
								className="flex items-center justify-between gap-4 py-2.5"
							>
								<div>
									<div className="text-sm font-medium">{cardLabel(card)}</div>
									<div className="text-muted-foreground text-[13px]">
										{earns(card)} · {fee(card)} annual fee
									</div>
								</div>
								<Button
									type="button"
									variant="outline"
									className="h-8 rounded-lg px-3 text-sm"
									disabled={save.isPending}
									onClick={() => add(card)}
								>
									Add
								</Button>
							</li>
						))}
						{!available.length && (
							<li className="text-muted-foreground py-2.5 text-sm">
								No cards match.
							</li>
						)}
					</ul>
				</Panel>
			)}

			{account.isPending ? (
				<p className="text-muted-foreground text-sm">Loading…</p>
			) : ownedCards.length ? (
				<div className="text-sm">
					<div
						className="text-muted-foreground hidden gap-x-4 border-b py-2 text-[13px] leading-[18px] font-medium md:grid md:grid-cols-[300px_minmax(0,1fr)_80px_120px_64px]"
						aria-hidden
					>
						<span>Card</span>
						<span>Earns</span>
						<span>Fee</span>
						<span>Terms checked</span>
					</div>
					<ul>
						{ownedCards.map((card) => (
							<li
								key={card.id}
								className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 border-b py-3 leading-5 md:grid-cols-[300px_minmax(0,1fr)_80px_120px_64px] md:items-center"
							>
								<span className="font-medium">{cardLabel(card)}</span>
								<span className="text-muted-foreground col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
									{earns(card)}
								</span>
								<span className="text-muted-foreground md:text-foreground col-span-2 row-start-3 text-[13px] md:col-span-1 md:row-start-auto md:text-sm">
									{fee(card)}
									<span className="md:hidden">
										{" "}
										annual fee · terms checked {card.checkedOn}
									</span>
								</span>
								<span className="text-muted-foreground hidden md:inline">
									{card.checkedOn}
								</span>
								<button
									type="button"
									className="text-muted-foreground hover:text-foreground col-start-2 row-start-1 text-right disabled:opacity-50 md:col-start-auto md:row-start-auto"
									disabled={save.isPending}
									onClick={() => remove(card.id)}
								>
									Remove
								</button>
							</li>
						))}
					</ul>
				</div>
			) : (
				<p className="text-muted-foreground border-b pb-3 text-sm">
					No cards yet. Add the cards you carry.
				</p>
			)}

			<div className="grid gap-4 md:grid-cols-2">
				<Panel
					title="Chrome"
					dot={chrome === "synced" ? "ok" : "idle"}
					action={
						<Link to="/sync" className="text-[13px] leading-[18px]">
							Manage sync
						</Link>
					}
				>
					<p className="text-muted-foreground text-[13px] leading-[18px]">
						{chrome === "synced" &&
							`Synced. The extension has the same ${count}.`}
						{chrome === "out-of-sync" &&
							"Installed, but its cards differ from your account."}
						{chrome === "unavailable" &&
							"Extension not detected in this browser."}
						{chrome === "loading" && "Checking…"}
					</p>
				</Panel>
				<Panel
					title="Texts"
					dot={phone.data?.linked ? "ok" : "idle"}
					action={
						<Link to="/texts" className="text-[13px] leading-[18px]">
							Open
						</Link>
					}
				>
					{phone.data?.linked ? (
						<p className="text-muted-foreground text-[13px] leading-[18px]">
							Linked to (•••) •••-{phone.data.last4} on{" "}
							{new Date(phone.data.linkedAt).toLocaleDateString()}.
						</p>
					) : (
						<div className="text-muted-foreground flex flex-wrap items-center gap-2 text-[13px] leading-[18px]">
							{linkCode.data ? (
								<span>
									Text{" "}
									<code className="bg-muted text-foreground rounded px-1.5 py-px font-mono">
										{linkCode.data.code}
									</code>{" "}
									to the Pointmaxx number to link.
								</span>
							) : (
								<span>No phone linked.</span>
							)}
							<button
								type="button"
								className="text-foreground underline disabled:opacity-50"
								disabled={linkCode.isPending}
								onClick={() => linkCode.mutate({})}
							>
								{linkCode.data ? "New code" : "Get link code"}
							</button>
						</div>
					)}
				</Panel>
			</div>

			{ownedCards.length > 0 && (
				<BestCardAt owned={owned} products={products} />
			)}
		</Page>
	);
}

type ChromeStatus = "loading" | "synced" | "out-of-sync" | "unavailable";

// Compares the extension's cards with the account's, if the extension answers.
function useChromeStatus(account: WalletCard[]): ChromeStatus {
	const [device, setDevice] = useState<string[] | "unavailable" | undefined>();
	useEffect(() => {
		let live = true;
		sendToExtension(ENV.EXTENSION_ID, { type: "cardmax:getWallet" }).then(
			(reply) => {
				if (!live) return;
				setDevice(
					"wallet" in reply
						? reply.wallet.map((card) => card.cardId)
						: "unavailable",
				);
			},
		);
		return () => {
			live = false;
		};
	}, []);
	if (device === undefined) return "loading";
	if (device === "unavailable") return "unavailable";
	const a = account
		.map((card) => card.cardId)
		.sort()
		.join();
	return a === [...device].sort().join() ? "synced" : "out-of-sync";
}
