import { drizzle } from 'drizzle-orm/node-postgres';

import { serverEnv } from '@/env/server';
import * as schema from './schema';

export const maindb = drizzle(serverEnv.DATABASE_URL, { schema });

// The MVP uses one PostgreSQL primary. Keep this alias so upstream query code
// remains stable while avoiding fake read-replica connections.
export const db = maindb;
export const allDatabases = [maindb] as const;
