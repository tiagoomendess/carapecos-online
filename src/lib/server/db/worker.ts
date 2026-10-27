import { env } from 'cloudflare:workers';
import { getDb } from './index.ts';

/** The app's database, from the Worker's D1 binding. Scripts use `getDb` with their own binding. */
export const db = () => getDb(env.DB);
