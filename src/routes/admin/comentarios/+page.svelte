<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { Badge, Button, ButtonGroup, Card, Heading } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime } from '#lib/format.ts';
	import AdminPagination from '#lib/components/admin/AdminPagination.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Actions keep the current filter in the URL (`?/hide&filtro=reported`)
	const keep = $derived(data.filter ? `&filtro=${data.filter}` : '');

	const tabs = [
		{ value: '', label: m.admin_comments_filter_all() },
		{ value: 'reported', label: m.admin_comments_filter_reported() },
		{ value: 'hidden', label: m.admin_comments_filter_hidden() }
	];
</script>

<svelte:head>
	<title>{m.admin_comments_title()} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-5xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h1" class="w-auto text-2xl">{m.admin_comments_title()}</Heading>
		<ButtonGroup>
			{#each tabs as tab (tab.value)}
				<Button
					href={tab.value ? `/admin/comentarios?filtro=${tab.value}` : '/admin/comentarios'}
					color={data.filter === tab.value ? 'primary' : 'alternative'}
					size="sm"
				>
					{tab.label}
				</Button>
			{/each}
		</ButtonGroup>
	</div>

	{#if data.comments.items.length}
		<ul class="grid gap-3">
			{#each data.comments.items as comment (comment.id)}
				{@const reported = comment.reportCount > 0 && comment.status === 'visible'}
				{@const hidden = comment.status === 'hidden'}
				<li>
					<Card
						size="xl"
						class={[
							'space-y-2 p-4',
							reported && 'border-red-300 dark:border-red-700',
							hidden && 'opacity-70'
						]}
					>
						<div class="flex flex-wrap items-center gap-2 text-sm">
							<span class="font-semibold text-gray-900 dark:text-white">{comment.authorName}</span>
							<span class="text-gray-500">{formatDateTime(comment.createdAt)}</span>
							{#if comment.parentId}<Badge color="gray">{m.admin_comment_reply_to()}</Badge>{/if}
							{#if reported}
								<Badge color="red">{m.admin_comment_reports({ count: comment.reportCount })}</Badge>
							{/if}
							{#if hidden}<Badge color="gray">{m.admin_comment_hidden()}</Badge>{/if}
						</div>
						<p class="text-sm whitespace-pre-line text-gray-700 dark:text-gray-200">
							{comment.body}
						</p>
						<p class="text-xs text-gray-500">
							{#if comment.pollSlug}
								<a
									href="{resolve('/(site)/sondagens/[slug]', {
										slug: comment.pollSlug
									})}#comentario-{comment.id}"
									target="_blank"
									class="hover:underline"
								>
									{m.admin_comment_on({ title: comment.pollQuestion ?? comment.pollSlug })} ↗
								</a>
							{:else if comment.articleSlug}
								<a
									href="{resolve('/(site)/noticias/[slug]', {
										slug: comment.articleSlug
									})}#comentario-{comment.id}"
									target="_blank"
									class="hover:underline"
								>
									{m.admin_comment_on({ title: comment.articleTitle ?? comment.articleSlug })} ↗
								</a>
							{/if}
						</p>
						<div class="flex flex-wrap gap-2">
							<form method="post" action={`${hidden ? '?/show' : '?/hide'}${keep}`} use:enhance>
								<input type="hidden" name="id" value={comment.id} />
								<Button type="submit" size="xs" color="alternative">
									{hidden ? m.admin_comment_show() : m.admin_comment_hide()}
								</Button>
							</form>
							{#if reported}
								<form method="post" action="?/dismiss{keep}" use:enhance>
									<input type="hidden" name="id" value={comment.id} />
									<Button type="submit" size="xs" color="alternative">
										{m.admin_comment_dismiss()}
									</Button>
								</form>
							{/if}
							<form
								method="post"
								action="?/delete{keep}"
								use:enhance={({ cancel }) => {
									if (!confirm(m.admin_comment_confirm_delete())) cancel();
								}}
							>
								<input type="hidden" name="id" value={comment.id} />
								<Button type="submit" size="xs" color="red" outline>{m.admin_delete()}</Button>
							</form>
						</div>
					</Card>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="py-12 text-center text-gray-500">{m.admin_none()}</p>
	{/if}

	<AdminPagination page={data.comments.page} pages={data.comments.pages} />
</main>
