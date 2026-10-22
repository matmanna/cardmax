import { randomUUID } from "node:crypto";
import type { Session } from "@cardmax/auth";
import { deviceTokenHeader } from "@cardmax/core";
import type { Database } from "@cardmax/db";
import { relations } from "@cardmax/db/relations";
import * as schema from "@cardmax/db/schema/index";
import { PGlite } from "@electric-sql/pglite";
import {
	generateDrizzleJson,
	generateMigration,
} from "drizzle-kit/api-postgres";
import { drizzle } from "drizzle-orm/pglite";

import type { Context } from "./context";

// In-memory Postgres with the current schema, so tests never touch a real database.
export async function createTestDb(): Promise<Database> {
	const client = new PGlite();
	const statements = await generateMigration(
		await generateDrizzleJson({}),
		await generateDrizzleJson(schema),
	);
	for (const statement of statements) await client.exec(statement);
	return drizzle({ client, relations }) as unknown as Database;
}

export async function createTestUser(db: Database, walletSyncConsent = true) {
	const id = randomUUID();
	await db.insert(schema.user).values({
		id,
		name: "Test",
		email: `${id}@example.com`,
		walletSyncConsent,
	});
	return { id, walletSyncConsent };
}

export function testContext(
	db: Database,
	options: {
		user?: { id: string; walletSyncConsent: boolean };
		deviceToken?: string;
	} = {},
): Context {
	const headers = new Headers();
	if (options.deviceToken) headers.set(deviceTokenHeader, options.deviceToken);
	const session = options.user
		? ({ user: options.user, session: {} } as unknown as Session)
		: null;
	return {
		db,
		session,
		headers,
		clientKey: null,
		listings: {},
		agentSecret: "test-agent-secret",
		agent: { webUrl: "http://localhost:3001" },
	};
}
