<script lang="ts">
	import { onMount } from 'svelte';
	import { VAPID_PUBLIC_KEY } from '$app/env/public';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * Opt-in to new-article notifications. Shown only where web push works; on iPhone and iPad
	 * that means the site added to the home screen, so Safari there gets instructions instead.
	 */
	type Status = 'hidden' | 'ios-hint' | 'denied' | 'off' | 'on';

	let status = $state<Status>('hidden');
	let busy = $state(false);
	let failed = $state(false);

	const supported = () =>
		'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

	onMount(async () => {
		if (!VAPID_PUBLIC_KEY) return;
		if (!supported()) {
			const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
			const standalone = matchMedia('(display-mode: standalone)').matches;
			if (ios && !standalone) status = 'ios-hint';
			return;
		}
		if (Notification.permission === 'denied') {
			status = 'denied';
			return;
		}
		const registration = await navigator.serviceWorker.ready;
		status = (await registration.pushManager.getSubscription()) ? 'on' : 'off';
	});

	const keyBytes = (base64url: string) =>
		Uint8Array.from(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

	async function enable() {
		busy = true;
		failed = false;
		try {
			if ((await Notification.requestPermission()) !== 'granted') {
				status = Notification.permission === 'denied' ? 'denied' : 'off';
				return;
			}
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: keyBytes(VAPID_PUBLIC_KEY)
			});
			const res = await fetch('/api/push', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(subscription.toJSON())
			});
			if (!res.ok) {
				await subscription.unsubscribe();
				throw new Error(`HTTP ${res.status}`);
			}
			status = 'on';
		} catch {
			failed = true;
		} finally {
			busy = false;
		}
	}

	async function disable() {
		busy = true;
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			if (subscription) {
				await fetch('/api/push', {
					method: 'DELETE',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ endpoint: subscription.endpoint })
				});
				await subscription.unsubscribe();
			}
			status = 'off';
		} finally {
			busy = false;
		}
	}
</script>

{#if status !== 'hidden'}
	<section class="push" aria-labelledby="push-title">
		<h2 id="push-title" class="font-semibold">🔔 {m.push_title()}</h2>
		{#if status === 'ios-hint'}
			<p class="text-caption text-text-2">{m.push_ios_hint()}</p>
		{:else if status === 'denied'}
			<p class="text-caption text-text-2">{m.push_denied()}</p>
		{:else}
			<p class="text-caption text-text-2">
				{status === 'on' ? m.push_enabled() : m.push_intro()}
			</p>
			<button
				type="button"
				class="toggle pressable"
				class:on={status === 'on'}
				disabled={busy}
				onclick={status === 'on' ? disable : enable}
			>
				{status === 'on' ? m.push_disable() : m.push_enable()}
			</button>
			{#if failed}<p class="text-caption text-red-600" role="alert">{m.push_failed()}</p>{/if}
		{/if}
	</section>
{/if}

<style>
	.push {
		display: grid;
		gap: 0.5rem;
		justify-items: start;
		padding: 1rem;
		border-radius: var(--radius-card);
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--separator);
	}

	.toggle {
		padding: 0.5rem 1rem;
		border-radius: 999px;
		background: var(--text);
		color: var(--bg);
		font-size: 0.875rem;
		font-weight: 600;
	}

	.toggle.on {
		background: var(--surface-2);
		color: var(--text);
	}

	.toggle:disabled {
		opacity: 0.5;
	}
</style>
