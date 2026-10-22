import { createHmac } from "node:crypto";
import type { Database } from "@cardmax/db";
import { countHit } from "@cardmax/db/rate-limit";
import { linkedPhone, phoneLinkCode } from "@cardmax/db/schema/phone";
import { wallet } from "@cardmax/db/schema/wallet";
import { and, eq, gt } from "drizzle-orm";

import type { AgentStore } from "./handle";
import { hashLinkCode } from "./link-code";

const codeAttempts = { limit: 5, windowMs: 10 * 60 * 1000 };

export function createAgentStore(db: Database, secret: string): AgentStore {
	return {
		async userForPhone(phone) {
			const [row] = await db
				.select({ userId: linkedPhone.userId })
				.from(linkedPhone)
				.where(eq(linkedPhone.phone, phone));
			return row?.userId ?? null;
		},

		async consumeLinkCode(code) {
			const [row] = await db
				.delete(phoneLinkCode)
				.where(
					and(
						eq(phoneLinkCode.codeHash, hashLinkCode(code, secret)),
						gt(phoneLinkCode.expiresAt, new Date()),
					),
				)
				.returning({ userId: phoneLinkCode.userId });
			return row?.userId ?? null;
		},

		async linkPhone(userId, phone) {
			await db.transaction(async (tx) => {
				// A number belongs to one account; relinking moves it.
				await tx.delete(linkedPhone).where(eq(linkedPhone.phone, phone));
				await tx
					.insert(linkedPhone)
					.values({ userId, phone })
					.onConflictDoUpdate({
						target: linkedPhone.userId,
						set: { phone, linkedAt: new Date() },
					});
			});
		},

		async unlinkPhone(phone) {
			await db.delete(linkedPhone).where(eq(linkedPhone.phone, phone));
		},

		async walletFor(userId) {
			const [row] = await db
				.select({ cards: wallet.cards })
				.from(wallet)
				.where(eq(wallet.userId, userId));
			return row?.cards ?? [];
		},

		async allowCodeAttempt(phone) {
			// Keyed by a hash so the rate-limit table never holds a phone number.
			const key = createHmac("sha256", secret)
				.update(`phone:${phone}`)
				.digest("base64url")
				.slice(0, 22);
			const count = await countHit(db, `link:${key}`, codeAttempts.windowMs);
			return count <= codeAttempts.limit;
		},
	};
}
