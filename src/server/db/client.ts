import "server-only";

import postgres, { type Sql } from "postgres";
import { env } from "~/env";

const globalForDb = globalThis as unknown as {
  histoGuessrSql?: Sql;
};

export const sql =
  globalForDb.histoGuessrSql ??
  postgres(env.DATABASE_URL, {
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.histoGuessrSql = sql;
}
