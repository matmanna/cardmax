import { beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "@cardmax/db";
import { wallet } from "@cardmax/db/schema/wallet";
import { call, ORPCError } from "@orpc/server";

import { createTestDb, createTestUser, testContext } from "../test-db";
import { agentRouter } from "./agent";

let db: Database;

beforeAll(async () => {
	db = await createTestDb();
});

describe("agent.try", () => {
	test("answers a typed store with the user's best card", async () => {
		const user = await createTestUser(db);
		await db.insert(wallet).values({
			userId: user.id,
			cards: [
				{ cardId: "amex-gold", addedAt: "2026-10-22" },
				{ cardId: "citi-double-cash", addedAt: "2026-10-22" },
			],
		});
		const { reply } = await call(
			agentRouter.try,
			{ text: "whole foods" },
			{ context: testContext(db, { user }) },
		);
		expect(reply).toContain("Gold");
	});

	test("without a photo reader, a photo asks for the store name", async () => {
		const user = await createTestUser(db);
		const { reply } = await call(
			agentRouter.try,
			{ imageUrl: "data:image/png;base64,iVBORw0KGgo=" },
			{ context: testContext(db, { user }) },
		);
		expect(reply.toLowerCase()).toContain("name");
	});

	test("needs a session and rejects non-image data", async () => {
		const user = await createTestUser(db);
		const anonymous = call(
			agentRouter.try,
			{ text: "cvs" },
			{ context: testContext(db) },
		);
		await expect(anonymous).rejects.toBeInstanceOf(ORPCError);
		const html = call(
			agentRouter.try,
			{ imageUrl: "data:text/html;base64,PGgxPg==" },
			{ context: testContext(db, { user }) },
		);
		await expect(html).rejects.toBeInstanceOf(ORPCError);
	});
});
