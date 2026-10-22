import { randomBytes, randomUUID } from "node:crypto";
import {
	type DeviceWallet,
	deviceWallet,
	type WalletCard,
} from "@cardmax/core";
import { deviceLink } from "@cardmax/db/schema/device";
import { eq } from "drizzle-orm";
import z from "zod";

import { deviceProcedure, hashDeviceToken, protectedProcedure } from "../index";
import {
	assertWalletConsent,
	readWallet,
	saveWallet,
	walletInput,
} from "./wallet";

function toDeviceWallet(
	row: { cards: WalletCard[]; updatedAt: Date } | null,
): DeviceWallet {
	return row
		? { cards: row.cards, updatedAt: row.updatedAt.toISOString() }
		: null;
}

const ok = z.object({ ok: z.literal(true) });

export const deviceRouter = {
	// Called from the web app with the cookie session. The token is returned once.
	link: protectedProcedure
		.output(z.object({ token: z.string() }))
		.handler(async ({ context }) => {
			assertWalletConsent(context.session.user);
			const token = randomBytes(32).toString("base64url");
			await context.db.insert(deviceLink).values({
				id: randomUUID(),
				userId: context.session.user.id,
				tokenHash: hashDeviceToken(token),
			});
			return { token };
		}),
	// Privacy page: disconnects every extension on the account.
	unlinkAll: protectedProcedure.output(ok).handler(async ({ context }) => {
		await context.db
			.delete(deviceLink)
			.where(eq(deviceLink.userId, context.session.user.id));
		return { ok: true as const };
	}),
	// The extension disconnects itself.
	unlink: deviceProcedure.output(ok).handler(async ({ context }) => {
		await context.db
			.delete(deviceLink)
			.where(eq(deviceLink.id, context.device.id));
		return { ok: true as const };
	}),
	wallet: {
		get: deviceProcedure
			.output(deviceWallet)
			.handler(async ({ context }) =>
				toDeviceWallet(await readWallet(context.db, context.device.userId)),
			),
		put: deviceProcedure
			.input(walletInput)
			.output(deviceWallet)
			.handler(async ({ context, input }) => {
				assertWalletConsent(context.device);
				return toDeviceWallet(
					await saveWallet(context.db, context.device.userId, input),
				);
			}),
	},
};
