import { createHash } from "node:crypto";
import { deviceTokenHeader } from "@cardmax/core";
import { user } from "@cardmax/db/schema/auth";
import { deviceLink } from "@cardmax/db/schema/device";
import { ORPCError, os } from "@orpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	return next({
		context: {
			session: context.session,
		},
	});
});

export const protectedProcedure = publicProcedure.use(requireAuth);

export function hashDeviceToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

// The extension authenticates with a device token header instead of a cookie.
const requireDevice = o.middleware(async ({ context, next }) => {
	const token = context.headers.get(deviceTokenHeader);
	if (!token || token.length < 32 || token.length > 128) {
		throw new ORPCError("UNAUTHORIZED");
	}
	const [link] = await context.db
		.update(deviceLink)
		.set({ lastUsedAt: new Date() })
		.where(eq(deviceLink.tokenHash, hashDeviceToken(token)))
		.returning({ id: deviceLink.id, userId: deviceLink.userId });
	if (!link) throw new ORPCError("UNAUTHORIZED");
	const [owner] = await context.db
		.select({ walletSyncConsent: user.walletSyncConsent })
		.from(user)
		.where(eq(user.id, link.userId));
	if (!owner) throw new ORPCError("UNAUTHORIZED");
	return next({
		context: {
			device: { ...link, walletSyncConsent: owner.walletSyncConsent },
		},
	});
});

export const deviceProcedure = publicProcedure.use(requireDevice);
