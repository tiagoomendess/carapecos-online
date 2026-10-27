import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description:
			'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	},
	S3_ENDPOINT: {
		description:
			'S3 API endpoint for file storage: LocalStack (`http://localhost:4566`) in development, `https://<account-id>.r2.cloudflarestorage.com` for R2.'
	},
	S3_REGION: {
		description: 'S3 region: `us-east-1` for LocalStack, `auto` for R2.'
	},
	S3_BUCKET: {
		description: 'Bucket that holds uploaded media.'
	},
	S3_ACCESS_KEY_ID: {
		description: 'S3 access key id (`test` for LocalStack).'
	},
	S3_SECRET_ACCESS_KEY: {
		description: 'S3 secret access key (`test` for LocalStack).'
	},
	MEDIA_BASE_URL: {
		public: true,
		description:
			'Public base URL that media is served from, without a trailing slash: the LocalStack bucket URL in development, an R2 custom domain in production.'
	},
	TURNSTILE_SITE_KEY: {
		public: true,
		description:
			'Cloudflare Turnstile site key, for the comment, vote and contact forms. In development, the always-passing test key `1x00000000000000000000AA`.'
	},
	TURNSTILE_SECRET_KEY: {
		description:
			'Cloudflare Turnstile secret key. In development, the always-passing test key `1x0000000000000000000000000000000AA`.'
	},
	VAPID_PUBLIC_KEY: {
		public: true,
		description:
			'Web push (VAPID) public key, base64url. Generate a key pair with `npm run vapid`. Empty disables notifications.'
	},
	VAPID_PRIVATE_KEY: {
		description: 'Web push (VAPID) private key, base64url. Keep it secret.'
	},
	VAPID_SUBJECT: {
		description:
			'Contact for push services, as `mailto:` or `https:` URL, e.g. `mailto:geral@carapecos.com`.'
	},
	CF_ANALYTICS_TOKEN: {
		public: true,
		description:
			'Cloudflare Web Analytics site token (cookieless). Empty in development: no analytics.'
	}
});
