import { catalog, walletCard } from "@cardmax/core";
import { wallet } from "@cardmax/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import z from "zod";

import { protectedProcedure } from "../index";

// Unknown keys are stripped by walletCard, so nothing beyond cardId and addedAt is stored.
// cardId must be a catalog id, so the server never holds free text.
const catalogIds = new Set(catalog.map((card) => card.id));
export const walletInput = z
	.array(
		walletCard.extend({
			cardId: z.string().refine((id) => catalogIds.has(id), "Unknown card"),
			addedAt: z.string().max(40),
		}),
	)
	.max(100);

export function assertWalletConsent(user: { walletSyncConsent?: boolean }) {
	if (user.walletSyncConsent !== true) {
		throw new ORPCError("FORBIDDEN", {
			message: "Wallet sync was not accepted for this account",
		});
	}
}

export const walletRouter = {
	get: protectedProcedure.handler(async ({ context }) => {
		const [row] = await context.db
			.select({ cards: wallet.cards, updatedAt: wallet.updatedAt })
			.from(wallet)
			.where(eq(wallet.userId, context.session.user.id));
		return row ?? null;
	}),
	put: protectedProcedure
		.input(walletInput)
		.handler(async ({ context, input }) => {
			assertWalletConsent(context.session.user);
			const [row] = await context.db
				.insert(wallet)
				.values({ userId: context.session.user.id, cards: input })
				.onConflictDoUpdate({
					target: wallet.userId,
					set: { cards: input, updatedAt: new Date() },
				})
				.returning({ cards: wallet.cards, updatedAt: wallet.updatedAt });
			return row;
		}),
};
