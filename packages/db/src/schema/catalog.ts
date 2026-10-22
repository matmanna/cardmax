import type { Category, EarnRule } from "@cardmax/core";
import {
	date,
	doublePrecision,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

// Public card data, seeded from @cardmax/core. No personal data lives here.
export const cardProduct = pgTable("card_product", {
	id: text("id").primaryKey(),
	issuer: text("issuer").notNull(),
	name: text("name").notNull(),
	rewardCurrency: text("reward_currency").$type<"cash" | "points">().notNull(),
	annualFeeUsd: doublePrecision("annual_fee_usd").notNull(),
	baseMultiplier: doublePrecision("base_multiplier").notNull(),
	rules: jsonb("rules").$type<EarnRule[]>().notNull(),
	sourceUrl: text("source_url").notNull(),
	checkedOn: date("checked_on", { mode: "string" }).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const merchant = pgTable("merchant", {
	domain: text("domain").primaryKey(),
	category: text("category").$type<Category>().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
