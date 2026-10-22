import type { Session } from "@cardmax/auth";
import type { Database } from "@cardmax/db";

export type Context = {
  session: Session | null;
  db: Database;
};
