import { beforeAll, describe, expect, test } from "bun:test";
import { catalog, catalogResponse, merchantMap } from "@cardmax/core";
import type { Database } from "@cardmax/db";
import { cardProduct } from "@cardmax/db/schema/catalog";
import { seedCatalog } from "@cardmax/db/seed-catalog";
import { call } from "@orpc/server";
import { eq } from "drizzle-orm";

import { createTestDb, testContext } from "../test-db";
import { catalogRouter } from "./catalog";

let db: Database;

beforeAll(async () => {
	db = await createTestDb();
});

describe("catalog.list", () => {
	test("falls back to core's catalog before seeding", async () => {
		const result = await call(catalogRouter.list, undefined, {
			context: testContext(db),
		});
		expect(catalogResponse.parse(result).cards).toHaveLength(catalog.length);
	});

	test("returns the seeded catalog without a session", async () => {
		await seedCatalog(db);
		const result = await call(catalogRouter.list, undefined, {
			context: testContext(db),
		});
		const parsed = catalogResponse.parse(result);
		expect(parsed.cards).toHaveLength(catalog.length);
		expect(parsed.merchants).toHaveLength(Object.keys(merchantMap).length);
		expect(parsed.cards.find((c) => c.id === catalog[0]?.id)).toEqual(
			catalogResponse.shape.cards.element.parse(catalog[0]),
		);
	});

	test("seeding twice leaves updatedAt alone", async () => {
		const before = await call(catalogRouter.list, undefined, {
			context: testContext(db),
		});
		await seedCatalog(db);
		const after = await call(catalogRouter.list, undefined, {
			context: testContext(db),
		});
		expect(after.updatedAt).toBe(before.updatedAt);
	});

	test("drops rows that fail core's schema", async () => {
		const id = catalog[0]?.id ?? "";
		await db
			.update(cardProduct)
			.set({ sourceUrl: "not a url" })
			.where(eq(cardProduct.id, id));
		const result = await call(catalogRouter.list, undefined, {
			context: testContext(db),
		});
		expect(result.cards.some((c) => c.id === id)).toBe(false);
		expect(result.cards).toHaveLength(catalog.length - 1);
		await seedCatalog(db);
	});
});
