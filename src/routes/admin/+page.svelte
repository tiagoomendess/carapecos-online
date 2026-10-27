<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button, Card, Heading, Listgroup, ListgroupItem } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { formatListDate } from '#lib/format.ts';
	import { displayStatus } from '#lib/admin/status.ts';
	import StatusBadge from '#lib/components/admin/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const stats = $derived([
		{
			label: m.admin_dashboard_published(),
			value: data.counts.published,
			href: '/admin/artigos?estado=published'
		},
		{
			label: m.admin_dashboard_scheduled(),
			value: data.counts.scheduled,
			href: '/admin/artigos?estado=scheduled'
		},
		{
			label: m.admin_dashboard_drafts(),
			value: data.counts.drafts,
			href: '/admin/artigos?estado=draft'
		},
		{ label: m.admin_dashboard_media(), value: data.counts.images, href: '/admin/multimedia' },
		{ label: m.admin_dashboard_subscribers(), value: data.counts.subscribers, href: null }
	]);

	// Things waiting for someone, shown only when there are any
	const attention = $derived(
		[
			{
				label: m.admin_dashboard_reported(),
				value: data.counts.reported,
				href: '/admin/comentarios?filtro=reported'
			},
			{
				label: m.admin_dashboard_unread(),
				value: data.counts.unread ?? 0,
				href: '/admin/mensagens'
			}
		].filter((item) => item.value > 0)
	);
</script>

<svelte:head>
	<title>{m.admin_dashboard_title()} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-5xl space-y-6 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h1" class="w-auto text-2xl">
			{data.user ? m.admin_welcome({ name: data.user.name }) : m.admin_dashboard_title()}
		</Heading>
		<Button href={resolve('/admin/artigos/novo')}>{m.admin_article_new()}</Button>
	</div>

	{#if attention.length}
		<div class="flex flex-wrap gap-3">
			{#each attention as item (item.label)}
				<Button href={item.href} color="red" outline>
					{item.label}: <span class="ms-1 font-bold tabular-nums">{item.value}</span>
				</Button>
			{/each}
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
		{#each stats as stat (stat.label)}
			<Card href={stat.href ?? undefined} size="xl" class="p-4">
				<span class="text-3xl font-bold text-gray-900 tabular-nums dark:text-white">
					{stat.value}
				</span>
				<span class="text-sm text-gray-500">{stat.label}</span>
			</Card>
		{/each}
	</div>

	<section class="space-y-3">
		<Heading tag="h2" class="text-lg">{m.admin_dashboard_recent()}</Heading>
		<Listgroup class="w-full">
			{#each data.recent as article (article.id)}
				<ListgroupItem
					href={resolve('/admin/artigos/[id]', { id: article.id })}
					class="flex items-center justify-between gap-3"
				>
					<span class="min-w-0 truncate">{article.title || m.admin_untitled()}</span>
					<span class="flex shrink-0 items-center gap-2 text-xs text-gray-500">
						{formatListDate(article.updatedAt)}
						<StatusBadge status={displayStatus(article.status, article.publishedAt)} />
					</span>
				</ListgroupItem>
			{/each}
		</Listgroup>
	</section>
</main>
