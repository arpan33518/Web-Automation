import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const rawUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  '';

// Strip -pooler to ensure HTTP /sql proxy compatibility
const connectionString = rawUrl
  .replace('-pooler.', '.')
  .replace(/([?&])channel_binding=[^&]+(&|$)/, '$1')
  .replace(/[?&]$/, '');

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing.');
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
export type DbClient = typeof db;

