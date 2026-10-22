import { catalog, type WalletCard } from "@cardmax/core";
import { Button } from "@cardmax/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ENV } from "@/env";
import { type ExtensionReply, sendToExtension } from "@/lib/extension";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/sync")({
	component: RouteComponent,
});

const cardNames = new Map(
	catalog.map((card) => [card.id, `${card.issuer} ${card.name}`]),
);

type DeviceState =
	| { status: "loading" }
	| { status: "ready"; wallet: WalletCard[] }
	| { status: "error"; message: string };

function toDeviceState(reply: ExtensionReply): DeviceState {
	if ("wallet" in reply) return { status: "ready", wallet: reply.wallet };
	if ("error" in reply) return { status: "error", message: reply.error };
	return { status: "error", message: "Unexpected reply from the extension" };
}

function RouteComponent() {
	const queryClient = useQueryClient();
	const [device, setDevice] = useState<DeviceState>({ status: "loading" });

	const account = useQuery(orpc.wallet.get.queryOptions());
	const invalidateAccount = () =>
		queryClient.invalidateQueries({ queryKey: orpc.wallet.get.key() });

	const readDevice = useCallback(async () => {
		setDevice({ status: "loading" });
		const reply = await sendToExtension(ENV.EXTENSION_ID, {
			type: "cardmax:getWallet",
		});
		setDevice(toDeviceState(reply));
	}, []);

	useEffect(() => {
		readDevice();
	}, [readDevice]);

	const saveToAccount = useMutation(
		orpc.wallet.put.mutationOptions({
			onSuccess: () => {
				toast.success("Saved this device's wallet to your account");
				invalidateAccount();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const removeFromAccount = useMutation(
		orpc.wallet.delete.mutationOptions({
			onSuccess: () => {
				toast.success("Removed the wallet from your account");
				invalidateAccount();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	async function loadOntoDevice(wallet: WalletCard[]) {
		if (
			!window.confirm(
				"Replace the cards on this device with your account copy?",
			)
		) {
			return;
		}
		const reply = await sendToExtension(ENV.EXTENSION_ID, {
			type: "cardmax:setWallet",
			wallet,
		});
		if ("error" in reply) {
			toast.error(reply.error);
			return;
		}
		toast.success("Loaded your account wallet onto this device");
		readDevice();
	}

	const accountCards = account.data?.cards ?? [];

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-bold">Sync your wallet</h1>
				<p className="text-muted-foreground text-sm">
					Only card issuer and product move between this device and your
					account. No card numbers, purchases, or browsing.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<section className="space-y-3 border p-4">
					<h2 className="font-semibold">This device (extension)</h2>
					{device.status === "loading" && <p>Reading the extension…</p>}
					{device.status === "error" && (
						<p className="text-red-500">{device.message}</p>
					)}
					{device.status === "ready" && <CardList cards={device.wallet} />}
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							disabled={device.status !== "ready" || saveToAccount.isPending}
							onClick={() =>
								device.status === "ready" && saveToAccount.mutate(device.wallet)
							}
						>
							Save to account
						</Button>
						<Button type="button" variant="outline" onClick={readDevice}>
							Refresh
						</Button>
					</div>
				</section>

				<section className="space-y-3 border p-4">
					<h2 className="font-semibold">Your account (server)</h2>
					{account.isPending && <p>Loading…</p>}
					{account.data === null && <p>Nothing synced yet.</p>}
					{account.data && (
						<>
							<CardList cards={accountCards} />
							<p className="text-muted-foreground text-xs">
								Updated {new Date(account.data.updatedAt).toLocaleString()}
							</p>
						</>
					)}
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							disabled={!account.data || device.status === "loading"}
							onClick={() => loadOntoDevice(accountCards)}
						>
							Load onto this device
						</Button>
						<Button
							type="button"
							variant="destructive"
							disabled={!account.data || removeFromAccount.isPending}
							onClick={() => removeFromAccount.mutate({})}
						>
							Remove from account
						</Button>
					</div>
				</section>
			</div>
		</div>
	);
}

function CardList({ cards }: { cards: WalletCard[] }) {
	if (!cards.length) return <p>No cards.</p>;
	return (
		<ul className="list-disc pl-5 text-sm">
			{cards.map((card) => (
				<li key={card.cardId}>{cardNames.get(card.cardId) ?? card.cardId}</li>
			))}
		</ul>
	);
}
