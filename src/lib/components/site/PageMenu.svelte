<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { MenuLink } from '#lib/types.ts';

	let { links }: { links: MenuLink[] } = $props();
</script>

{#if links.length}
	<nav class="menu" aria-label={m.page_menu()}>
		<ul class="group">
			{#each links as link (link.id)}
				<li>
					<!-- CMS paths and off-site URLs; already classified on the server -->
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						href={link.href}
						class={['item', 'pressable']}
						target={link.external ? '_blank' : undefined}
						rel={link.external ? 'noopener noreferrer' : undefined}
					>
						{link.label}
						{#if link.external}
							<span class="ext" aria-hidden="true">↗</span>
							<span class="sr-only">{m.nav_external()}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/if}

<style>
	.menu {
		margin-top: 2rem;
	}

	.group {
		overflow: hidden;
		margin: 0;
		padding: 0;
		list-style: none;
		border-radius: var(--radius-card);
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--separator);
	}

	.item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 1rem;
		color: var(--text);
		font-size: 1.0625rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		line-height: 1.3;
		text-decoration: none;
	}

	li + li .item::before {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		left: 1rem;
		height: 1px;
		background: var(--separator);
	}

	.ext {
		display: grid;
		flex: none;
		margin-inline-start: auto;
		color: var(--text-2);
	}

	@media (hover: hover) and (pointer: fine) {
		.item:hover {
			background: var(--surface-2);
		}
	}
</style>
