import type { WalletCard } from "@cardmax/core";
import { defineRelationsPart } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

// One row per user. Holds issuer and product ids only, never numbers or amounts.
export const wallet = pgTable("wallet", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	cards: jsonb("cards").$type<WalletCard[]>().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const walletRelations = defineRelationsPart({ user, wallet }, (r) => ({
	wallet: {
		user: r.one.user({
			from: r.wallet.userId,
			to: r.user.id,
		}),
	},
}));
