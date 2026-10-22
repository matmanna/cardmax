import type { Database } from "@cardmax/db";
import { countHit } from "@cardmax/db/rate-limit";
import { linkedPhone, phoneLinkCode } from "@cardmax/db/schema/phone";
import { wallet } from "@cardmax/db/schema/wallet";
import { and, eq, gt } from "drizzle-orm";

import type { AgentStore } from "./handle";
import { hashLinkCode, hashPhone } from "./link-code";

const codeWindowMs = 10 * 60 * 1000;
const codeAttemptsPerPhone = 5;
// Caps guessing from many numbers at once: 6 digits is a small space.
const codeAttemptsGlobal = 200;

export function createAgentStore(db: Database, secret: string): AgentStore {
	return {
		async userForPhone(phone) {
			const [row] = await db
				.select({ userId: linkedPhone.userId })
				.from(linkedPhone)
				.where(eq(linkedPhone.phoneHash, hashPhone(phone, secret)));
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
			const phoneHash = hashPhone(phone, secret);
			const last4 = phone.slice(-4);
			await db.transaction(async (tx) => {
				// A number belongs to one account; relinking moves it.
				await tx
					.delete(linkedPhone)
					.where(eq(linkedPhone.phoneHash, phoneHash));
				await tx
					.insert(linkedPhone)
					.values({ userId, phoneHash, last4 })
					.onConflictDoUpdate({
						target: linkedPhone.userId,
						set: { phoneHash, last4, linkedAt: new Date() },
					});
			});
		},

		async unlinkPhone(phone) {
			await db
				.delete(linkedPhone)
				.where(eq(linkedPhone.phoneHash, hashPhone(phone, secret)));
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
			const key = hashPhone(phone, secret).slice(0, 22);
			const perPhone = await countHit(db, `link:${key}`, codeWindowMs);
			const global = await countHit(db, "link:all", codeWindowMs);
			return perPhone <= codeAttemptsPerPhone && global <= codeAttemptsGlobal;
		},
	};
}
