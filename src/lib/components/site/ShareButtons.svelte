<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import Icon from './Icon.svelte';

	let { url, title }: { url: string; title: string } = $props();

	// The native share sheet (mostly mobile) replaces the individual buttons when available
	let canShare = $state(false);
	let copied = $state(false);
	let copiedTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		canShare = typeof navigator.share === 'function';
		return () => clearTimeout(copiedTimer);
	});

	async function share() {
		try {
			await navigator.share({ title, url });
		} catch {
			// Dismissed by the reader
		}
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			return;
		}
		copied = true;
		clearTimeout(copiedTimer);
		copiedTimer = setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="share" role="group" aria-label={m.share_label()}>
	{#if canShare}
		<button type="button" class="button pressable" onclick={share}>
			<Icon name="share" size={18} />
			{m.share_label()}
		</button>
	{:else}
		<a
			class="button pressable"
			href="https://wa.me/?text={encodeURIComponent(`${title} ${url}`)}"
			target="_blank"
			rel="noopener noreferrer"
			aria-label={m.share_whatsapp()}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path
					d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z"
				/>
			</svg>
			<span class="hidden md:inline">WhatsApp</span>
		</a>
		<a
			class="button pressable"
			href="https://www.facebook.com/sharer/sharer.php?u={encodeURIComponent(url)}"
			target="_blank"
			rel="noopener noreferrer"
			aria-label={m.share_facebook()}
		>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path
					d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4a20 20 0 0 0-2.2-.1c-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21z"
				/>
			</svg>
			<span class="hidden md:inline">Facebook</span>
		</a>
		<button type="button" class="button pressable" onclick={copy}>
			<Icon name={copied ? 'check' : 'link'} size={18} />
			<span aria-live="polite">{copied ? m.share_copied() : m.share_copy()}</span>
		</button>
	{/if}
</div>

<style>
	.share {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.button {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 2.5rem;
		padding: 0.5rem 0.9rem;
		border-radius: 999px;
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--separator);
		font-size: 0.875rem;
		font-weight: 600;
	}
</style>
