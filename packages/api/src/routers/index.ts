import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { agentRouter } from "./agent";
import { catalogRouter } from "./catalog";
import { deviceRouter } from "./device";
import { listingsRouter } from "./listings";
import { phoneRouter } from "./phone";
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
	agent: agentRouter,
	catalog: catalogRouter,
	device: deviceRouter,
	phone: phoneRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
