import type { Session } from "@cardmax/auth";
import type { Database } from "@cardmax/db";

export type Context = {
	session: Session | null;
	db: Database;
	// Request headers, read only for the device token.
	headers: Headers;
	// Salted hash of the client IP for rate limiting. Never the raw IP.
	clientKey: string | null;
	listings: { bestBuyApiKey?: string };
};
