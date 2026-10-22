import { catalogResponse } from "@cardmax/core";

import { loadCatalog } from "../catalog";
import { publicProcedure } from "../index";

export const catalogRouter = {
	// Public card data. Needs no account and takes no input.
	list: publicProcedure
		.output(catalogResponse)
		.handler(({ context }) => loadCatalog(context.db)),
};
