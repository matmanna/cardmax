import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@cardmax/db";
import * as schema from "@cardmax/db/schema/auth";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
};

export function createAuth(env: AuthConfig, database: Database) {
	return betterAuth({
		database: drizzleAdapter(database, {
			provider: "pg",
			schema,
		}),
		trustedOrigins: [env.BETTER_AUTH_URL],
		emailAndPassword: { enabled: true },
		user: {
			// Deleting the user cascades to the wallet row.
			deleteUser: { enabled: true },
			additionalFields: {
				// Opt-in at sign-up: the server may read the wallet (issuer and product only).
				walletSyncConsent: {
					type: "boolean",
					required: true,
					input: true,
				},
			},
		},
		databaseHooks: {
			user: {
				create: {
					before: async (user) => {
						if (user.walletSyncConsent !== true) {
							throw new APIError("BAD_REQUEST", {
								message: "Accept wallet sync to create an account",
							});
						}
					},
				},
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		plugins: [tanstackStartCookies()],
	});
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
