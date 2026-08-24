import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load variables from .env.local where Neon env variables are pulled
dotenv.config({ path: '.env.local' });

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!,
  },
});
