import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { catalogRouter } from "./catalog";
import { deviceRouter } from "./device";
import { listingsRouter } from "./listings";
import { walletRouter } from "./wallet";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	wallet: walletRouter,
	listings: listingsRouter,
	catalog: catalogRouter,
	device: deviceRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
