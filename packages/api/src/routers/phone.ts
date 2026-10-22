import {
	generateLinkCode,
	hashLinkCode,
	linkCodeTtlMs,
} from "@cardmax/agent/link-code";
import { linkedPhone, phoneLinkCode } from "@cardmax/db/schema/phone";
import { eq } from "drizzle-orm";

import { protectedProcedure } from "../index";

export const phoneRouter = {
	// The dashboard shows only the last four digits of the linked number.
	status: protectedProcedure.handler(async ({ context }) => {
		const [row] = await context.db
			.select({ phone: linkedPhone.phone, linkedAt: linkedPhone.linkedAt })
			.from(linkedPhone)
			.where(eq(linkedPhone.userId, context.session.user.id));
		if (!row) return { linked: false as const };
		return {
			linked: true as const,
			last4: row.phone.slice(-4),
			linkedAt: row.linkedAt,
		};
	}),

	// Replaces any pending code. The plain code is returned once and never stored.
	createLinkCode: protectedProcedure.handler(async ({ context }) => {
		const code = generateLinkCode();
		const expiresAt = new Date(Date.now() + linkCodeTtlMs);
		const codeHash = hashLinkCode(code, context.agentSecret);
		await context.db
			.insert(phoneLinkCode)
			.values({ userId: context.session.user.id, codeHash, expiresAt })
			.onConflictDoUpdate({
				target: phoneLinkCode.userId,
				set: { codeHash, expiresAt },
			});
		return { code, expiresAt };
	}),

	unlink: protectedProcedure.handler(async ({ context }) => {
		await context.db
			.delete(linkedPhone)
			.where(eq(linkedPhone.userId, context.session.user.id));
		return { ok: true as const };
	}),
};
