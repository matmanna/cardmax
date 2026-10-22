import { defineRelationsPart } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

// A linked extension. Only the sha256 of the token is stored, never the token.
export const deviceLink = pgTable(
	"device_link",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		tokenHash: text("token_hash").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		lastUsedAt: timestamp("last_used_at"),
	},
	(table) => [index("device_link_userId_idx").on(table.userId)],
);

export const deviceRelations = defineRelationsPart(
	{ user, deviceLink },
	(r) => ({
		deviceLink: {
			user: r.one.user({
				from: r.deviceLink.userId,
				to: r.user.id,
			}),
		},
	}),
);
