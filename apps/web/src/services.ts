import { createAuth } from "@cardmax/auth";
import { createDb } from "@cardmax/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
