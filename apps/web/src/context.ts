import { createHmac } from "node:crypto";
import type { Context as ApiContext } from "@cardmax/api/context";

import { ENV } from "./env.server";
import { auth, db } from "./services";

// Vercel sets x-real-ip and x-forwarded-for itself, so clients cannot spoof them there.
function clientIp(headers: Headers): string | null {
	return (
		headers.get("x-real-ip") ??
		headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		null
	);
}

// Keyed hash so the rate-limit table never holds a raw IP.
function clientKey(headers: Headers): string | null {
	const ip = clientIp(headers);
	if (!ip) return null;
	return createHmac("sha256", ENV.BETTER_AUTH_SECRET)
		.update(ip)
		.digest("base64url")
		.slice(0, 22);
}

export async function createContext({
	req,
}: {
	req: Request;
}): Promise<ApiContext> {
	const session = await auth.api.getSession({
		headers: req.headers,
	});
	return {
		db,
		session,
		headers: req.headers,
		clientKey: clientKey(req.headers),
		listings: { bestBuyApiKey: ENV.BESTBUY_API_KEY || undefined },
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
