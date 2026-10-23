import { Link, useNavigate } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

import { Mark } from "../landing/mark";

const links = [
	{ to: "/dashboard", label: "Wallet" },
	{ to: "/sync", label: "Chrome sync" },
	{ to: "/texts", label: "Text agent" },
] as const;

// Below md the sidebar becomes a top bar with the same links.
export function MobileNav() {
	const navigate = useNavigate();
	return (
		<nav className="bg-secondary/50 flex items-center gap-1 overflow-x-auto border-b px-4 py-2.5 md:hidden">
			<Link to="/" className="mr-2 shrink-0" aria-label="Pointmaxx">
				<Mark size={20} />
			</Link>
			{links.map(({ to, label }) => (
				<Link
					key={to}
					to={to}
					className="text-muted-foreground shrink-0 rounded-[7px] px-2.5 py-1.5 text-sm leading-5"
					activeProps={{
						className:
							"bg-background text-foreground font-medium shadow-[0_0_0_1px_var(--border)]",
					}}
				>
					{label}
				</Link>
			))}
			<button
				type="button"
				className="text-muted-foreground ml-auto shrink-0 pl-2 text-sm leading-5"
				onClick={() =>
					authClient.signOut({
						fetchOptions: { onSuccess: () => navigate({ to: "/" }) },
					})
				}
			>
				Sign out
			</button>
		</nav>
	);
}

export function Sidebar() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	return (
		<aside className="bg-secondary/50 hidden w-55 shrink-0 flex-col justify-between border-r px-3 py-5 md:flex">
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
