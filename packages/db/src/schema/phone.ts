import { defineRelationsPart } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

// The only phone data we keep: one verified number per user, removed on unlink or account deletion.
export const linkedPhone = pgTable("linked_phone", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	phone: text("phone").notNull().unique(),
	linkedAt: timestamp("linked_at").defaultNow().notNull(),
});

// One pending code per user. codeHash is an HMAC, never the code itself.
export const phoneLinkCode = pgTable("phone_link_code", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	codeHash: text("code_hash").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
});

export const phoneRelations = defineRelationsPart(
	{ user, linkedPhone, phoneLinkCode },
	(r) => ({
		linkedPhone: {
			user: r.one.user({ from: r.linkedPhone.userId, to: r.user.id }),
		},
		phoneLinkCode: {
			user: r.one.user({ from: r.phoneLinkCode.userId, to: r.user.id }),
		},
	}),
);
