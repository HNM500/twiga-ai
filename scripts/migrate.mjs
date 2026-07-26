import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run migrations');
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle/twiga-migrations' });
  console.log('Twiga database migrations applied');
} finally {
  await pool.end();
}
