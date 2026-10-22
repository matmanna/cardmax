import { Button } from "@cardmax/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

// Paper: Platform › "06 Text agent".
export const Route = createFileRoute("/_auth/texts")({
	component: RouteComponent,
});

// Matches the server's cap (maxImageBytes in @cardmax/agent).
const maxPhotoBytes = 5 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

function RouteComponent() {
	const queryClient = useQueryClient();
	const status = useQuery(orpc.phone.status.queryOptions());
	const refreshStatus = () =>
		queryClient.invalidateQueries({ queryKey: orpc.phone.status.key() });

	const linkCode = useMutation(
		orpc.phone.createLinkCode.mutationOptions({
			onError: (error) => toast.error(error.message),
		}),
	);
	const unlink = useMutation(
		orpc.phone.unlink.mutationOptions({
			onSuccess: () => {
				toast.success("Unlinked your phone");
				refreshStatus();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const [text, setText] = useState("");
	const [photo, setPhoto] = useState<string | null>(null);
	const ask = useMutation(
		orpc.agent.try.mutationOptions({
			onError: (error) => toast.error(error.message),
		}),
	);

	async function pickPhoto(file: File | undefined) {
		if (!file) return;
		if (!["image/jpeg", "image/png"].includes(file.type)) {
			toast.error("Use a JPEG or PNG photo");
			return;
		}
		if (file.size > maxPhotoBytes) {
			toast.error("That photo is over 5 MB");
			return;
		}
		setPhoto(await readAsDataUrl(file));
	}

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Text agent</h1>
				<p className="text-muted-foreground text-sm">
					Text a store name or a storefront photo and get the card to use.
				</p>
			</div>

			<section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
				<div>
					<h2 className="font-semibold">Linked phone</h2>
					{status.isPending && <p className="text-sm">Loading…</p>}
					{status.data?.linked && (
						<p className="text-muted-foreground text-sm">
							(•••) •••-{status.data.last4} · linked{" "}
							{new Date(status.data.linkedAt).toLocaleDateString()}
						</p>
					)}
					{status.data && !status.data.linked && !linkCode.data && (
						<p className="text-muted-foreground text-sm">
							No phone linked yet.
						</p>
					)}
					{linkCode.data && !status.data?.linked && (
						<p className="text-sm">
							Text{" "}
							<code className="bg-muted rounded px-2 py-1 font-mono">
								{linkCode.data.code}
							</code>{" "}
							to the Cardmax number. It works once and expires{" "}
							{new Date(linkCode.data.expiresAt).toLocaleTimeString()}.
						</p>
					)}
				</div>
				<div className="flex gap-2">
					{status.data?.linked ? (
						<Button
							type="button"
							variant="outline"
							disabled={unlink.isPending}
							onClick={() => unlink.mutate({})}
						>
							Unlink
						</Button>
					) : (
						<Button
							type="button"
							disabled={linkCode.isPending}
							onClick={() => linkCode.mutate({})}
						>
							{linkCode.data ? "New code" : "Get a link code"}
						</Button>
					)}
					<Button type="button" variant="outline" onClick={refreshStatus}>
						Refresh
					</Button>
				</div>
			</section>

			<section className="bg-muted space-y-3 rounded-xl p-4">
				<div className="flex items-baseline justify-between">
					<h2 className="font-semibold">Try it here</h2>
					<span className="text-muted-foreground text-xs">
						Same answer you'd get by text
					</span>
				</div>
				<form
					className="flex flex-wrap gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						ask.mutate({
							text: text.trim() || undefined,
							imageUrl: photo ?? undefined,
						});
					}}
				>
					<input
						className="bg-background min-w-48 flex-1 rounded-md border px-3 py-2 text-sm"
						placeholder="Type a store, like whole foods"
						value={text}
						maxLength={200}
						onChange={(event) => setText(event.target.value)}
					/>
					<label className="bg-background cursor-pointer rounded-md border px-3 py-2 text-sm font-medium">
						{photo ? "Change photo" : "Add photo"}
						<input
							type="file"
							accept="image/jpeg,image/png"
							className="sr-only"
							onChange={(event) => pickPhoto(event.target.files?.[0])}
						/>
					</label>
					<Button
						type="submit"
						disabled={ask.isPending || (!text.trim() && !photo)}
					>
						{ask.isPending ? "Asking…" : "Ask"}
					</Button>
				</form>
				{(photo || ask.data) && (
					<div className="flex items-start gap-3">
						{photo && (
							<img
								src={photo}
								alt="Storefront you added"
								className="h-14 w-20 shrink-0 rounded-md object-cover"
							/>
						)}
						{ask.data && (
							<p className="bg-background rounded-2xl px-4 py-2 text-sm whitespace-pre-line">
								{ask.data.reply}
							</p>
						)}
					</div>
				)}
				<p className="text-muted-foreground text-xs">
					Photos have location data removed, go to Anthropic for this one
					answer, and aren't saved.
				</p>
			</section>

			<p className="text-muted-foreground text-sm">
				Texts go through Twilio and your carrier, so they can read them. Cardmax
				never asks for card numbers or amounts, and doesn't keep your messages
				after replying.
			</p>
		</div>
	);
}
