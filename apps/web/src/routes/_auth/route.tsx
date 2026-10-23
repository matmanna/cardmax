import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { MobileNav, Sidebar } from "@/components/platform/sidebar";
import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
	beforeLoad: async () => {
		const session = await getUser();
		if (!session) {
			throw redirect({
				to: "/login",
			});
		}
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function AuthLayout() {
	return (
		<div className="flex min-h-svh flex-col md:flex-row">
			<MobileNav />
			<Sidebar />
			<main className="min-w-0 flex-1">
				<Outlet />
			</main>
		</div>
	);
}
