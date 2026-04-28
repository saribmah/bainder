import { drizzle } from "drizzle-orm/d1";
import type { RuntimeEnv } from "../app/context";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

export const createDb = (env: RuntimeEnv) => drizzle(env.DB, { schema });
