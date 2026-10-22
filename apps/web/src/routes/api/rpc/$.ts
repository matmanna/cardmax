import { appRouter } from "@cardmax/api/routers/index";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ORPCError, onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createFileRoute } from "@tanstack/react-router";

import { createContext } from "../../../context";
import { ENV } from "../../../env.server";

// ORPCError.cause can hold the request input (for example a ListingQuery that
// failed validation), so log only the code and message for those.
function logError(error: unknown) {
	if (error instanceof ORPCError) {
		console.error(`oRPC ${error.code}: ${error.message}`);
		return;
	}
	console.error(error);
}

// Only the Cardmax extension may call the API cross-origin, and never with cookies.
const extensionOrigin = ENV.EXTENSION_ID
	? `chrome-extension://${ENV.EXTENSION_ID}`
	: null;

const rpcHandler = new RPCHandler(appRouter, {
	plugins: [
		new CORSPlugin({
			origin: (origin) => (origin === extensionOrigin ? origin : null),
			allowMethods: ["POST", "OPTIONS"],
			credentials: false,
		}),
	],
	interceptors: [onError(logError)],
});

const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [onError(logError)],
});

async function handle({ request }: { request: Request }) {
	const rpcResult = await rpcHandler.handle(request, {
		prefix: "/api/rpc",
		context: await createContext({ req: request }),
	});
	if (rpcResult.response) return rpcResult.response;

	const apiResult = await apiHandler.handle(request, {
		prefix: "/api/rpc/api-reference",
		context: await createContext({ req: request }),
	});
	if (apiResult.response) return apiResult.response;

	return new Response("Not found", { status: 404 });
}

export const Route = createFileRoute("/api/rpc/$")({
	server: {
		handlers: {
			HEAD: handle,
			OPTIONS: handle,
			GET: handle,
			POST: handle,
			PUT: handle,
			PATCH: handle,
			DELETE: handle,
		},
	},
});
