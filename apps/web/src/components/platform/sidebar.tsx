import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

import { Mark } from "../landing/mark";

const links = [
	{ to: "/dashboard", label: "Wallet" },
	{ to: "/sync", label: "Chrome sync" },
	{ to: "/texts", label: "Text agent" },
] as const;

export function Sidebar() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	return (
		<aside className="bg-secondary/50 flex w-55 shrink-0 flex-col justify-between border-r px-3 py-5">
			<div className="flex flex-col gap-0.5">
				<Link to="/" className="flex items-center gap-2 px-2 pb-4">
					<Mark size={20} />
					<span className="text-[15px] leading-5 font-semibold">Pointmaxx</span>
				</Link>
				{links.map(({ to, label }) => (
					<Link
						key={to}
						to={to}
						className="text-muted-foreground hover:text-foreground rounded-[7px] px-2.5 py-1.75 text-sm leading-5"
						activeProps={{
							className:
								"bg-background text-foreground font-medium shadow-[0_0_0_1px_var(--border)]",
						}}
					>
						{label}
					</Link>
				))}
			</div>
			<div className="flex flex-col gap-0.5 px-2.5 text-[13px] leading-[18px]">
				<span className="truncate">{session?.user.email}</span>
				<button
					type="button"
					className="text-muted-foreground hover:text-foreground w-fit"
					onClick={() =>
						authClient.signOut({
							fetchOptions: { onSuccess: () => navigate({ to: "/" }) },
						})
					}
				>
					Sign out
				</button>
			</div>
		</aside>
	);
}
