import type { Database } from "@cardmax/db";
import { countHit } from "@cardmax/db/rate-limit";
import { ORPCError } from "@orpc/server";

export type RateLimitRule = { name: string; limit: number; windowMs: number };

// Counts one hit for clientKey and throws TOO_MANY_REQUESTS past the limit.
export async function enforceRateLimit(
	db: Database,
	clientKey: string | null,
	rule: RateLimitRule,
	now = Date.now(),
): Promise<void> {
	const count = await countHit(
		db,
		`${rule.name}:${clientKey ?? "unknown"}`,
		rule.windowMs,
		now,
	);
	if (count > rule.limit) {
		throw new ORPCError("TOO_MANY_REQUESTS", {
			message: "Too many searches. Try again in a minute.",
		});
	}
}
