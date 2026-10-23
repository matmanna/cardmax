import {
	catalog as bundledCatalog,
	type CardProduct,
	type Category,
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

// "3% dining, 3% drugstore, 1.5% everything else"
function earns(card: CardProduct) {
	const parts = card.rules
		.filter((rule) => !rule.onlyMerchants)
		.map(
			(rule) =>
				`${rate(card, rule.multiplier)} ${categoryLabels[rule.category]}`,
		);
	const merchants = card.rules.filter((rule) => rule.onlyMerchants).length;
	if (merchants)
		parts.push(`${merchants} merchant bonus${merchants > 1 ? "es" : ""}`);
	parts.push(
		`${rate(card, card.baseMultiplier)} everything${parts.length ? " else" : ""}`,
	);
	return parts.join(", ");
}

function fee(card: CardProduct) {
	return `$${card.annualFeeUsd}`;
}

const spotlight: { label: string; category: Category }[] = [
	{ label: "Dining", category: "dining" },
	{ label: "Groceries", category: "grocery" },
	{ label: "Drugstores", category: "drugstore" },
	{ label: "Everything else", category: "other" },
];

function bestFor(cards: CardProduct[], category: Category) {
	let best: { card: CardProduct; multiplier: number } | undefined;
	for (const card of cards) {
		const rule = card.rules.find(
			(r) => r.category === category && !r.onlyMerchants,
		);
		const multiplier = rule?.multiplier ?? card.baseMultiplier;
		if (!best || multiplier > best.multiplier) best = { card, multiplier };
	}
	return best;
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
				<table className="w-full text-left text-sm">
					<thead>
						<tr className="text-muted-foreground border-b text-[13px] font-medium">
							<th className="w-75 py-2 font-medium">Card</th>
							<th className="w-85 py-2 font-medium">Earns</th>
							<th className="w-20 py-2 font-medium">Fee</th>
							<th className="w-30 py-2 font-medium">Terms checked</th>
							<th />
						</tr>
					</thead>
					<tbody>
						{ownedCards.map((card) => (
							<tr key={card.id} className="border-b">
								<td className="py-3 pr-4 font-medium">{cardLabel(card)}</td>
								<td className="text-muted-foreground py-3 pr-4">
									{earns(card)}
								</td>
								<td className="py-3">{fee(card)}</td>
								<td className="text-muted-foreground py-3">{card.checkedOn}</td>
								<td className="py-3 text-right">
									<button
										type="button"
										className="text-muted-foreground hover:text-foreground disabled:opacity-50"
										disabled={save.isPending}
										onClick={() => remove(card.id)}
									>
										Remove
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			) : (
				<p className="text-muted-foreground border-b pb-3 text-sm">
					No cards yet. Add the cards you carry.
				</p>
			)}

			<div className="grid gap-4 md:grid-cols-2">
				<Panel title="Chrome extension">
					<p className="text-muted-foreground text-[13px] leading-[18px]">
						{chrome === "synced" && "Synced with your account."}
						{chrome === "out-of-sync" &&
							"Installed, but its cards differ from your account."}
						{chrome === "unavailable" && "Not detected in this browser."}
						{chrome === "loading" && "Checking…"}{" "}
						<Link to="/sync" className="text-foreground underline">
							Manage sync
						</Link>
					</p>
				</Panel>
				<Panel title="Text agent">
					{phone.data?.linked ? (
						<p className="text-muted-foreground text-[13px] leading-[18px]">
							(•••) •••-{phone.data.last4} · linked{" "}
							{new Date(phone.data.linkedAt).toLocaleDateString()}.{" "}
							<Link to="/texts" className="text-foreground underline">
								Open
							</Link>
						</p>
					) : (
						<div className="text-muted-foreground flex flex-wrap items-center gap-3 text-[13px] leading-[18px]">
							{linkCode.data ? (
								<span>
									Text{" "}
									<code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono">
										{linkCode.data.code}
									</code>{" "}
									to the Pointmaxx number.
								</span>
							) : (
								<span>No phone linked.</span>
							)}
							<Button
								type="button"
								variant="outline"
								className="h-8 rounded-lg px-3 text-sm"
								disabled={linkCode.isPending}
								onClick={() => linkCode.mutate({})}
							>
								{linkCode.data ? "New code" : "Get link code"}
							</Button>
							<Link to="/texts" className="text-foreground underline">
								Open
							</Link>
						</div>
					)}
				</Panel>
			</div>

			{ownedCards.length > 0 && (
				<Panel title="Which card where" tone="muted">
					<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
						{spotlight.map(({ label, category }) => {
							const best = bestFor(ownedCards, category);
							return (
								<div
									key={category}
									className="bg-background rounded-lg px-3 py-2.5 text-[13px] leading-[18px]"
								>
									<div className="text-muted-foreground">{label}</div>
									<div className="font-medium">
										{best
											? `${best.card.name} · ${rate(best.card, best.multiplier)}`
											: "—"}
									</div>
								</div>
							);
						})}
					</div>
				</Panel>
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
