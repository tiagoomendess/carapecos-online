import { createAuth } from '#lib/server/auth.ts';

type Auth = ReturnType<typeof createAuth>;

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			user?: Auth['$Infer']['Session']['user'];
			session?: Auth['$Infer']['Session']['session'];
			auth: Auth;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
