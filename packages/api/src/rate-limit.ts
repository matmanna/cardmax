import type { Database } from "@cardmax/db";
import { rateLimit } from "@cardmax/db/schema/rate-limit";
import { ORPCError } from "@orpc/server";
import { lt, sql } from "drizzle-orm";

export type RateLimitRule = { name: string; limit: number; windowMs: number };

export function windowStart(now: number, windowMs: number): Date {
	return new Date(Math.floor(now / windowMs) * windowMs);
}

// Counts one hit for clientKey and throws TOO_MANY_REQUESTS past the limit.
export async function enforceRateLimit(
	db: Database,
	clientKey: string | null,
	rule: RateLimitRule,
	now = Date.now(),
): Promise<void> {
	const start = windowStart(now, rule.windowMs);
	const [row] = await db
		.insert(rateLimit)
		.values({
			key: `${rule.name}:${clientKey ?? "unknown"}`,
			windowStart: start,
		})
		.onConflictDoUpdate({
			target: [rateLimit.key, rateLimit.windowStart],
			set: { count: sql`${rateLimit.count} + 1` },
		})
		.returning({ count: rateLimit.count });
	// Old windows are useless; drop them so the table stays tiny.
	await db
		.delete(rateLimit)
		.where(
			lt(rateLimit.windowStart, new Date(start.getTime() - rule.windowMs)),
		);
	if ((row?.count ?? 0) > rule.limit) {
		throw new ORPCError("TOO_MANY_REQUESTS", {
			message: "Too many searches. Try again in a minute.",
		});
	}
}
