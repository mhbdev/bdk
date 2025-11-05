import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { schema } from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5434/sizpay';

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });