import { catalog, type WalletCard } from "@cardmax/core";
import { Button } from "@cardmax/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
	buttonShape,
	Page,
	PageHeader,
	Panel,
} from "@/components/platform/page";
import { ENV } from "@/env";
import { authClient } from "@/lib/auth-client";
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
	const { data: session } = authClient.useSession();

	// Hands the extension a device token so it syncs by itself from now on.
	const connect = useMutation(
		orpc.device.link.mutationOptions({
			onSuccess: async ({ token }) => {
				const reply = await sendToExtension(ENV.EXTENSION_ID, {
					type: "cardmax:connect",
					token,
					email: session?.user.email ?? "",
				});
				if ("error" in reply) {
					toast.error(reply.error);
					return;
				}
				toast.success("Connected. The extension now syncs by itself.");
				readDevice();
				invalidateAccount();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Page>
			<PageHeader
				title="Chrome sync"
				subtitle="Only card issuer and product move between this device and your account. No card numbers, purchases, or browsing."
			/>

			<Panel>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-sm font-semibold">Connect the extension</h2>
						<p className="text-muted-foreground text-[13px] leading-[18px]">
							After this, changes in the extension save to your account and your
							account fills the extension. Disconnect any time from the popup.
						</p>
					</div>
					<Button
						className={buttonShape}
						type="button"
						disabled={connect.isPending || device.status !== "ready"}
						onClick={() => connect.mutate({})}
					>
						Connect and sync automatically
					</Button>
				</div>
			</Panel>

			<div className="grid gap-4 md:grid-cols-2">
				<Panel title="This device (extension)">
					{device.status === "loading" && <p>Reading the extension…</p>}
					{device.status === "error" && (
						<p className="text-destructive text-[13px]">{device.message}</p>
					)}
					{device.status === "ready" && <CardList cards={device.wallet} />}
					<div className="flex flex-wrap gap-2">
						<Button
							className={buttonShape}
							type="button"
							disabled={device.status !== "ready" || saveToAccount.isPending}
							onClick={() =>
								device.status === "ready" && saveToAccount.mutate(device.wallet)
							}
						>
							Save to account
						</Button>
						<Button
							type="button"
							variant="outline"
							className={buttonShape}
							onClick={readDevice}
						>
							Refresh
						</Button>
					</div>
				</Panel>

				<Panel title="Your account">
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
							className={buttonShape}
							type="button"
							disabled={!account.data || device.status === "loading"}
							onClick={() => loadOntoDevice(accountCards)}
						>
							Load onto this device
						</Button>
						<Button
							className={buttonShape}
							type="button"
							variant="destructive"
							disabled={!account.data || removeFromAccount.isPending}
							onClick={() => removeFromAccount.mutate({})}
						>
							Remove from account
						</Button>
					</div>
				</Panel>
			</div>

			<PhonePanel />
		</Page>
	);
}

// Link a phone to the text agent with a one-time code the user texts in.
function PhonePanel() {
	const queryClient = useQueryClient();
	const status = useQuery(orpc.phone.status.queryOptions());
	const [pending, setPending] = useState<{ code: string; expiresAt: Date }>();
	const refreshStatus = () =>
		queryClient.invalidateQueries({ queryKey: orpc.phone.status.key() });

	const createCode = useMutation(
		orpc.phone.createLinkCode.mutationOptions({
			onSuccess: (data) => setPending(data),
			onError: (error) => toast.error(error.message),
		}),
	);
	const unlink = useMutation(
		orpc.phone.unlink.mutationOptions({
			onSuccess: () => {
				toast.success("Phone unlinked");
				refreshStatus();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Panel title="Text agent">
			<p className="text-muted-foreground text-[13px] leading-[18px]">
				Text a store name and get the card in your synced wallet that earns the
				most there. Your texts pass through the messaging provider and your
				carrier, and both can read them.
			</p>
			{status.data?.linked ? (
				<div className="flex flex-wrap items-center gap-3">
					<p>Linked to the number ending in {status.data.last4}.</p>
					<Button
						className={buttonShape}
						type="button"
						variant="outline"
						disabled={unlink.isPending}
						onClick={() => unlink.mutate({})}
					>
						Unlink
					</Button>
				</div>
			) : (
				<div className="space-y-2">
					{pending && (
						<p>
							Text <strong className="font-mono text-lg">{pending.code}</strong>{" "}
							to the Pointmaxx number. It expires at{" "}
							{new Date(pending.expiresAt).toLocaleTimeString()}.
						</p>
					)}
					<div className="flex flex-wrap gap-2">
						<Button
							className={buttonShape}
							type="button"
							disabled={createCode.isPending}
							onClick={() => createCode.mutate({})}
						>
							{pending ? "New code" : "Get link code"}
						</Button>
						{pending && (
							<Button
								type="button"
								variant="outline"
								className={buttonShape}
								onClick={refreshStatus}
							>
								I sent it
							</Button>
						)}
					</div>
				</div>
			)}
		</Panel>
	);
}

function CardList({ cards }: { cards: WalletCard[] }) {
	if (!cards.length) return <p>No cards.</p>;
	return (
		<ul className="divide-y text-sm">
			{cards.map((card) => (
				<li key={card.cardId} className="py-2">
					{cardNames.get(card.cardId) ?? card.cardId}
				</li>
			))}
		</ul>
	);
}
