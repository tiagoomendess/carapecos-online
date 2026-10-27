<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Button,
		Heading,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import StatusBadge from '#lib/components/admin/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.admin_pages_title()} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-6xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h1" class="w-auto text-2xl">{m.admin_pages_title()}</Heading>
		<Button href={resolve('/admin/paginas/nova')}>{m.admin_page_new()}</Button>
	</div>

	<Table hoverable class="bg-white dark:bg-gray-800">
		<TableHead>
			<TableHeadCell>{m.admin_field_title()}</TableHeadCell>
			<TableHeadCell>{m.admin_field_slug()}</TableHeadCell>
			<TableHeadCell>{m.admin_status()}</TableHeadCell>
			<TableHeadCell class="hidden sm:table-cell">{m.admin_field_show_in_footer()}</TableHeadCell>
			<TableHeadCell class="hidden sm:table-cell">{m.admin_field_show_in_menu()}</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each data.pages as page (page.id)}
				<TableBodyRow>
					<TableBodyCell>
						<a
							href={resolve('/admin/paginas/[id]', { id: page.id })}
							class="font-medium text-gray-900 hover:underline dark:text-white"
						>
							{page.title}
						</a>
					</TableBodyCell>
					<TableBodyCell>/{page.slug}</TableBodyCell>
					<TableBodyCell>
						<StatusBadge status={page.status === 'published' ? 'published' : 'draft'} />
					</TableBodyCell>
					<TableBodyCell class="hidden sm:table-cell">{page.showInFooter ? '✓' : ''}</TableBodyCell>
					<TableBodyCell class="hidden sm:table-cell">{page.showInMenu ? '✓' : ''}</TableBodyCell>
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
</main>
