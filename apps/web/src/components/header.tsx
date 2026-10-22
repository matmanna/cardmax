import { Link } from "@tanstack/react-router";

import { Mark } from "./landing/mark";
import UserMenu from "./user-menu";

export default function Header() {
	const links = [
		{ to: "/dashboard", label: "Dashboard" },
		{ to: "/sync", label: "Sync" },
		{ to: "/texts", label: "Texts" },
	] as const;

	return (
		<header className="bg-background border-b">
			<div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
				<div className="flex items-center gap-8">
					<Link to="/" className="flex items-center gap-2 font-semibold">
						<Mark size={22} />
						Pointmaxx
					</Link>
					<nav className="flex gap-6 text-sm">
						{links.map(({ to, label }) => (
							<Link
								key={to}
								to={to}
								className="text-muted-foreground hover:text-foreground transition-colors"
								activeProps={{ className: "text-foreground font-medium" }}
							>
								{label}
							</Link>
						))}
					</nav>
				</div>
				<UserMenu />
			</div>
		</header>
	);
}
