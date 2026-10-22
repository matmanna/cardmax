import {
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

// Fixed-window request counters. key is a salted hash of the client IP, never the IP itself.
export const rateLimit = pgTable(
	"rate_limit",
	{
		key: text("key").notNull(),
		windowStart: timestamp("window_start").notNull(),
		count: integer("count").notNull().default(1),
	},
	(table) => [primaryKey({ columns: [table.key, table.windowStart] })],
);
