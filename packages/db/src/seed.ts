import "varlock/auto-load";

import { createDb } from "./index";
import { seedCatalog } from "./seed-catalog";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const db = createDb({ DATABASE_URL: url });
const counts = await seedCatalog(db);
console.log(`Seeded ${counts.cards} cards and ${counts.merchants} merchants`);
await db.$client.end();
