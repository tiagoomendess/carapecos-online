import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { admin } from 'better-auth/plugins/admin';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';
import { getRequestEvent } from '$app/server';
import { getDb } from '#lib/server/db/index.ts';

const ac = createAccessControl(defaultStatements);

// Admins manage everything, including users. Editors manage content only.
export const roles = {
	admin: ac.newRole(adminAc.statements),
	editor: ac.newRole({ user: [], session: [] })
};

export type Role = keyof typeof roles;

const authConfig = {
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	// No public sign-up: admins create users from the backoffice
	emailAndPassword: { enabled: true, disableSignUp: true },
	plugins: [
		admin({ ac, roles, defaultRole: 'editor', adminRoles: ['admin'] }),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
} satisfies Omit<Parameters<typeof betterAuth>[0], 'database'>;

export const createAuth = (d1: D1Database) =>
	betterAuth({
		...authConfig,
		database: drizzleAdapter(getDb(d1), { provider: 'sqlite' })
	});

/**
 * DO NOT USE!
 *
 * This instance is used by the `auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth(null!);
