<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Heading,
		Helper,
		Input,
		Label,
		Modal,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Textarea
	} from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Category = PageProps['data']['categories'][number];

	// `null` closed, `'new'` creating, or the category being edited
	let editing = $state<Category | 'new' | null>(null);
	const current = $derived(editing === 'new' ? null : editing);
</script>

<svelte:head>
	<title>{m.admin_categories_title()} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-5xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h1" class="w-auto text-2xl">{m.admin_categories_title()}</Heading>
		<Button onclick={() => (editing = 'new')}>{m.admin_category_new()}</Button>
	</div>

	{#if form?.error}<Alert color="red">{form.error}</Alert>{/if}

	<Table hoverable class="bg-white dark:bg-gray-800">
		<TableHead>
			<TableHeadCell>{m.admin_field_name()}</TableHeadCell>
			<TableHeadCell>{m.admin_field_slug()}</TableHeadCell>
			<TableHeadCell class="text-right">{m.admin_column_articles()}</TableHeadCell>
			<TableHeadCell class="text-right">{m.admin_field_sort_order()}</TableHeadCell>
			<TableHeadCell><span class="sr-only">{m.admin_actions()}</span></TableHeadCell>
		</TableHead>
		<TableBody>
			{#each data.categories as category (category.id)}
				<TableBodyRow>
					<TableBodyCell class="font-medium text-gray-900 dark:text-white"
						>{category.name}</TableBodyCell
					>
					<TableBodyCell>/categoria/{category.slug}</TableBodyCell>
					<TableBodyCell class="text-right tabular-nums">{category.articles}</TableBodyCell>
					<TableBodyCell class="text-right tabular-nums">{category.sortOrder}</TableBodyCell>
					<TableBodyCell class="text-right">
						<Button size="xs" color="alternative" onclick={() => (editing = category)}>
							{m.admin_edit()}
						</Button>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</main>

<Modal
	open={!!editing}
	onclose={() => (editing = null)}
	title={current ? m.admin_category_edit() : m.admin_category_new()}
	size="md"
>
	{#key editing}
		<form
			id="category-form"
			method="post"
			action={current ? '?/update' : '?/create'}
			class="space-y-4"
			use:enhance={() =>
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') editing = null;
				}}
		>
			<input type="hidden" name="id" value={current?.id ?? ''} />
			<div>
				<Label for="name" class="mb-2">{m.admin_field_name()}</Label>
				<Input id="name" name="name" value={current?.name ?? ''} required maxlength={60} />
			</div>
			<div>
				<Label for="slug" class="mb-2">{m.admin_field_slug()}</Label>
				<Input id="slug" name="slug" value={current?.slug ?? ''} maxlength={60} />
				<Helper class="mt-1">{m.admin_category_slug_hint()}</Helper>
			</div>
			<div>
				<Label for="description" class="mb-2">{m.admin_field_description()}</Label>
				<Textarea
					id="description"
					name="description"
					rows={2}
					value={current?.description ?? ''}
					class="w-full"
				/>
				<Helper class="mt-1">{m.admin_field_description_hint()}</Helper>
			</div>
			<div>
				<Label for="sortOrder" class="mb-2">{m.admin_field_sort_order()}</Label>
				<Input id="sortOrder" name="sortOrder" type="number" value={current?.sortOrder ?? 0} />
				<Helper class="mt-1">{m.admin_field_sort_order_hint()}</Helper>
			</div>
		</form>
	{/key}
	{#snippet footer()}
		<div class="flex w-full flex-wrap justify-between gap-2">
			<div class="flex gap-2">
				<Button type="submit" form="category-form">{m.admin_save()}</Button>
				<Button type="button" color="alternative" onclick={() => (editing = null)}>
					{m.admin_cancel()}
				</Button>
			</div>
			{#if current}
				<form
					method="post"
					action="?/delete"
					use:enhance={({ cancel }) => {
						if (!confirm(m.admin_confirm_delete({ title: current.name }))) return cancel();
						return async ({ update }) => {
							editing = null;
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={current.id} />
					<Button type="submit" color="red" outline>{m.admin_delete()}</Button>
				</form>
			{/if}
		</div>
	{/snippet}
</Modal>
