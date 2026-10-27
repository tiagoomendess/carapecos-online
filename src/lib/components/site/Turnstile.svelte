<script lang="ts" module>
	interface TurnstileApi {
		render(container: HTMLElement, options: Record<string, unknown>): string;
		remove(widgetId: string): void;
	}

	declare global {
		interface Window {
			turnstile?: TurnstileApi;
		}
	}

	let script: Promise<TurnstileApi> | undefined;

	/** Cloudflare's script, loaded once, and only when a form needs it */
	function loadTurnstile() {
		script ??= new Promise((resolve, reject) => {
			const el = document.createElement('script');
			el.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			el.async = true;
			el.onload = () => (window.turnstile ? resolve(window.turnstile) : reject());
			el.onerror = () => {
				script = undefined;
				reject(new Error('Turnstile failed to load'));
			};
			document.head.appendChild(el);
		});
		return script;
	}
</script>

<script lang="ts">
	import { TURNSTILE_SITE_KEY } from '$app/env/public';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * Cloudflare Turnstile, the bot check on reader forms. Usually invisible: it only shows a
	 * challenge when Cloudflare isn't sure. Tokens are single-use, so wrap it in `{#key}` to get
	 * a fresh one after each submission.
	 */
	let { token = $bindable(''), action }: { token?: string; action: string } = $props();

	let failed = $state(false);

	function mount(container: HTMLElement) {
		let widgetId: string | undefined;
		let removed = false;
		loadTurnstile()
			.then((turnstile) => {
				if (removed) return;
				widgetId = turnstile.render(container, {
					sitekey: TURNSTILE_SITE_KEY,
					action,
					appearance: 'interaction-only',
					language: 'pt',
					'response-field': false,
					callback: (value: string) => {
						token = value;
						failed = false;
					},
					'expired-callback': () => (token = ''),
					'error-callback': () => {
						token = '';
						failed = true;
					}
				});
			})
			.catch(() => (failed = true));
		return () => {
			removed = true;
			if (widgetId) window.turnstile?.remove(widgetId);
		};
	}
</script>

<input type="hidden" name="cf-turnstile-response" value={token} />
<div {@attach mount}></div>
{#if failed}
	<p class="text-caption text-red-600" role="alert">{m.turnstile_failed()}</p>
{:else if !token}
	<p class="text-caption text-text-2" aria-live="polite">{m.turnstile_loading()}</p>
{/if}
