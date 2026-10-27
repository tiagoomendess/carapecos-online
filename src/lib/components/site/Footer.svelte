<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import PushToggle from './PushToggle.svelte';

	let { pages }: { pages: { title: string; slug: string }[] } = $props();

	const year = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="inner">
		<a href={resolve('/(site)')} class="brand" aria-label={m.nav_home()}>
			<img src="/logo-128.webp" alt="" width="40" height="40" class="size-10" />
			<span>
				<strong class="block font-semibold">{m.site_name()}</strong>
				<span class="text-caption text-text-2">{m.site_tagline()}</span>
			</span>
		</a>

		<nav aria-label={m.footer_pages()}>
			<ul class="links">
				{#each pages as page (page.slug)}
					<li><a href={resolve('/(site)/[slug]', { slug: page.slug })}>{page.title}</a></li>
				{/each}
				<li><a href={resolve('/rss.xml')} data-sveltekit-reload>RSS</a></li>
			</ul>
		</nav>

		<PushToggle />

		<p class="text-caption text-text-2">{m.footer_copyright({ year })}</p>
	</div>
</footer>

<style>
	.footer {
		margin-top: 4rem;
		border-top: 1px solid var(--separator);
		padding: 2rem var(--gutter) calc(2rem + env(safe-area-inset-bottom));
	}

	.inner {
		display: grid;
		gap: 1.25rem;
		max-width: 70rem;
		margin-inline: auto;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.25rem;
		font-size: 0.9375rem;
	}

	.links a {
		color: var(--text-2);
	}

	@media (hover: hover) {
		.links a:hover {
			color: var(--text);
		}
	}
</style>
