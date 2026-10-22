import { beforeAll, describe, expect, test } from "bun:test";
import { catalog, deviceWallet } from "@cardmax/core";
import type { Database } from "@cardmax/db";
import { user as userTable } from "@cardmax/db/schema/auth";
import { deviceLink } from "@cardmax/db/schema/device";
import { seedCatalog } from "@cardmax/db/seed-catalog";
import { call, ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import { hashDeviceToken } from "../index";
import { createTestDb, createTestUser, testContext } from "../test-db";
import { deviceRouter } from "./device";

const cardId = catalog[0]?.id ?? "";
const cards = [{ cardId, addedAt: "2026-10-22" }];

let db: Database;

beforeAll(async () => {
	db = await createTestDb();
	await seedCatalog(db);
});

async function linkDevice(user: { id: string; walletSyncConsent: boolean }) {
	const { token } = await call(deviceRouter.link, undefined, {
		context: testContext(db, { user }),
	});
	return token;
}

async function expectCode(promise: Promise<unknown>, code: string) {
	const error = await promise.then(
		() => null,
		(e: unknown) => e,
	);
	expect(error).toBeInstanceOf(ORPCError);
	expect((error as ORPCError<string, unknown>).code).toBe(code);
}

describe("device tokens", () => {
	test("link, get, put, unlink, then UNAUTHORIZED", async () => {
		const user = await createTestUser(db);
		const token = await linkDevice(user);
		const context = testContext(db, { deviceToken: token });

		expect(await call(deviceRouter.wallet.get, undefined, { context })).toBe(
			null,
		);

		const saved = await call(deviceRouter.wallet.put, cards, { context });
		expect(deviceWallet.parse(saved)).toEqual({
			cards,
			updatedAt: expect.any(String),
		});

		const fetched = await call(deviceRouter.wallet.get, undefined, {
			context,
		});
		expect(fetched).toEqual(saved);

		const [link] = await db
			.select()
			.from(deviceLink)
			.where(eq(deviceLink.userId, user.id));
		expect(link?.lastUsedAt).toBeInstanceOf(Date);

		await call(deviceRouter.unlink, undefined, { context });
		await expectCode(
			call(deviceRouter.wallet.get, undefined, { context }),
			"UNAUTHORIZED",
		);
	});

	test("rejects missing and unknown tokens", async () => {
		await expectCode(
			call(deviceRouter.wallet.get, undefined, { context: testContext(db) }),
			"UNAUTHORIZED",
		);
		await expectCode(
			call(deviceRouter.wallet.get, undefined, {
				context: testContext(db, { deviceToken: "x".repeat(43) }),
			}),
			"UNAUTHORIZED",
		);
	});

	test("stores only the sha256 of the token", async () => {
		const user = await createTestUser(db);
		const token = await linkDevice(user);
		expect(token).toMatch(/^[\w-]{43}$/);

		const rows = await db
			.select()
			.from(deviceLink)
			.where(eq(deviceLink.userId, user.id));
		expect(rows).toHaveLength(1);
		expect(rows[0]?.tokenHash).toBe(hashDeviceToken(token));
		expect(rows[0]?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
		expect(JSON.stringify(rows)).not.toContain(token);
	});

	test("unlinkAll removes every device on the account", async () => {
		const user = await createTestUser(db);
		const first = await linkDevice(user);
		await linkDevice(user);
		await call(deviceRouter.unlinkAll, undefined, {
			context: testContext(db, { user }),
		});
		const rows = await db
			.select()
			.from(deviceLink)
			.where(eq(deviceLink.userId, user.id));
		expect(rows).toHaveLength(0);
		await expectCode(
			call(deviceRouter.wallet.get, undefined, {
				context: testContext(db, { deviceToken: first }),
			}),
			"UNAUTHORIZED",
		);
	});

	test("link requires a session", async () => {
		await expectCode(
			call(deviceRouter.link, undefined, { context: testContext(db) }),
			"UNAUTHORIZED",
		);
	});
});

describe("consent", () => {
	test("link is refused without wallet sync consent", async () => {
		const user = await createTestUser(db, false);
		await expectCode(linkDevice(user), "FORBIDDEN");
	});

	test("put is refused once consent is withdrawn", async () => {
		const user = await createTestUser(db);
		const token = await linkDevice(user);
		await db
			.update(userTable)
			.set({ walletSyncConsent: false })
			.where(eq(userTable.id, user.id));
		await expectCode(
			call(deviceRouter.wallet.put, cards, {
				context: testContext(db, { deviceToken: token }),
			}),
			"FORBIDDEN",
		);
	});
});

describe("device.wallet.put validation", () => {
	test("rejects cards that are not in the catalog", async () => {
		const user = await createTestUser(db);
		const token = await linkDevice(user);
		await expectCode(
			call(
				deviceRouter.wallet.put,
				[{ cardId: "my secret note", addedAt: "2026-10-22" }],
				{ context: testContext(db, { deviceToken: token }) },
			),
			"BAD_REQUEST",
		);
	});

	test("strips extra fields such as last four", async () => {
		const user = await createTestUser(db);
		const token = await linkDevice(user);
		const saved = await call(
			deviceRouter.wallet.put,
			[{ cardId, addedAt: "2026-10-22", last4: "4242" } as never],
			{ context: testContext(db, { deviceToken: token }) },
		);
		expect(saved?.cards).toEqual(cards);
	});
});
