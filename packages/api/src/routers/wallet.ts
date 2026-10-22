import { walletCard } from "@cardmax/core";
import type { Database } from "@cardmax/db";
import { wallet } from "@cardmax/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { assertKnownCards } from "../catalog";
import { protectedProcedure } from "../index";

// Unknown keys are stripped by walletCard, so nothing beyond cardId and addedAt is stored.
// saveWallet also checks each cardId against the catalog, so the server never holds free text.
export const walletInput = z
	.array(
		walletCard.extend({
			cardId: z.string().min(1).max(80),
			addedAt: z.string().max(40),
		}),
	)
	.max(100);
export type WalletInput = z.infer<typeof walletInput>;

export function assertWalletConsent(user: { walletSyncConsent?: boolean }) {
	if (user.walletSyncConsent !== true) {
		throw new ORPCError("FORBIDDEN", {
			message: "Wallet sync was not accepted for this account",
		});
	}
}

export async function readWallet(db: Database, userId: string) {
	const [row] = await db
		.select({ cards: wallet.cards, updatedAt: wallet.updatedAt })
		.from(wallet)
		.where(eq(wallet.userId, userId));
	return row ?? null;
}

export async function saveWallet(
	db: Database,
	userId: string,
	cards: WalletInput,
) {
	await assertKnownCards(db, cards);
	const [row] = await db
		.insert(wallet)
		.values({ userId, cards })
		.onConflictDoUpdate({
			target: wallet.userId,
			set: { cards, updatedAt: new Date() },
		})
		.returning({ cards: wallet.cards, updatedAt: wallet.updatedAt });
	if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
	return row;
}

export const walletRouter = {
	get: protectedProcedure.handler(({ context }) =>
		readWallet(context.db, context.session.user.id),
	),
	put: protectedProcedure.input(walletInput).handler(({ context, input }) => {
		assertWalletConsent(context.session.user);
		return saveWallet(context.db, context.session.user.id, input);
	}),
	// "Remove from account": deletes the server copy. The device wallet is untouched.
	delete: protectedProcedure.handler(async ({ context }) => {
		await context.db
			.delete(wallet)
			.where(eq(wallet.userId, context.session.user.id));
		return { ok: true as const };
	}),
};
