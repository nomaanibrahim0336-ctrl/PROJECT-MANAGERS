import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema });
}

let cached: ReturnType<typeof createDb> | undefined;

export const db: ReturnType<typeof createDb> = new Proxy(
  {} as ReturnType<typeof createDb>,
  {
    get(_target, prop) {
      if (!cached) cached = createDb();
      return cached[prop as keyof typeof cached];
    },
  },
);
