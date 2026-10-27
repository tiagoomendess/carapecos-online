<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Button,
		Heading,
		Input,
		Select,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { formatListDate } from '#lib/format.ts';
	import { displayStatus } from '#lib/admin/status.ts';
	import AdminPagination from '#lib/components/admin/AdminPagination.svelte';
	import StatusBadge from '#lib/components/admin/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.admin_articles_title()} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-6xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h1" class="w-auto text-2xl">{m.admin_articles_title()}</Heading>
		<Button href={resolve('/admin/artigos/novo')}>{m.admin_article_new()}</Button>
	</div>

	<form method="get" class="flex flex-wrap gap-2" data-sveltekit-keepfocus>
		<Input
			type="search"
			name="q"
			value={data.filters.query}
			placeholder={m.admin_search()}
			aria-label={m.admin_search()}
			class="min-w-48 flex-1"
		/>
		<Select
			name="estado"
			value={data.filters.status}
			placeholder=""
			class="w-auto"
			aria-label={m.admin_status()}
		>
			<option value="">{m.admin_status_all()}</option>
			<option value="draft">{m.admin_status_draft()}</option>
			<option value="scheduled">{m.admin_status_scheduled()}</option>
			<option value="published">{m.admin_status_published()}</option>
		</Select>
		<Select
			name="categoria"
			placeholder=""
			value={data.filters.categoryId}
			class="w-auto"
			aria-label={m.admin_field_category()}
		>
			<option value="">{m.admin_filter_category_all()}</option>
			{#each data.categories as category (category.id)}
				<option value={category.id}>{category.name}</option>
			{/each}
		</Select>
		<Button type="submit" color="alternative">{m.admin_search()}</Button>
	</form>

	<p class="text-sm text-gray-500">{m.admin_articles_count({ count: data.articles.total })}</p>

	<Table hoverable class="bg-white dark:bg-gray-800">
		<TableHead>
			<TableHeadCell>{m.admin_field_title()}</TableHeadCell>
			<TableHeadCell class="hidden md:table-cell">{m.admin_field_category()}</TableHeadCell>
			<TableHeadCell>{m.admin_status()}</TableHeadCell>
			<TableHeadCell class="hidden sm:table-cell">{m.admin_column_date()}</TableHeadCell>
			<TableHeadCell class="hidden text-right lg:table-cell">{m.admin_column_views()}</TableHeadCell
			>
		</TableHead>
		<TableBody>
			{#each data.articles.items as article (article.id)}
				<TableBodyRow>
					<TableBodyCell class="max-w-md whitespace-normal">
						<a
							href={resolve('/admin/artigos/[id]', { id: article.id })}
							class="font-medium text-gray-900 hover:underline dark:text-white"
						>
							{article.title || m.admin_untitled()}
						</a>
						{#if article.featured}<span title={m.admin_field_featured()}>★</span>{/if}
					</TableBodyCell>
					<TableBodyCell class="hidden md:table-cell">{article.categoryName}</TableBodyCell>
					<TableBodyCell>
						<StatusBadge status={displayStatus(article.status, article.publishedAt)} />
					</TableBodyCell>
					<TableBodyCell class="hidden sm:table-cell">
						{article.publishedAt ? formatListDate(article.publishedAt) : '—'}
					</TableBodyCell>
					<TableBodyCell class="hidden text-right tabular-nums lg:table-cell">
						{article.viewCount}
					</TableBodyCell>
				</TableBodyRow>
			{:else}
				<TableBodyRow>
					<TableBodyCell colspan={5} class="text-center text-gray-500"
						>{m.admin_none()}</TableBodyCell
					>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>

	<AdminPagination page={data.articles.page} pages={data.articles.pages} />
</main>
