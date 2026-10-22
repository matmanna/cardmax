import { lt, sql } from "drizzle-orm";

import type { Database } from "./index";
import { rateLimit } from "./schema/rate-limit";

export function windowStart(now: number, windowMs: number): Date {
	return new Date(Math.floor(now / windowMs) * windowMs);
}

// Counts one hit for key in the current fixed window and returns the new count.
export async function countHit(
	db: Database,
	key: string,
	windowMs: number,
	now = Date.now(),
): Promise<number> {
	const start = windowStart(now, windowMs);
	const [row] = await db
		.insert(rateLimit)
		.values({ key, windowStart: start })
		.onConflictDoUpdate({
			target: [rateLimit.key, rateLimit.windowStart],
			set: { count: sql`${rateLimit.count} + 1` },
		})
		.returning({ count: rateLimit.count });
	// Old windows are useless; drop them so the table stays tiny.
	await db
		.delete(rateLimit)
		.where(lt(rateLimit.windowStart, new Date(start.getTime() - windowMs)));
	return row?.count ?? 0;
}
