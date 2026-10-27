<script lang="ts">
	import { resolve } from '$app/paths';
	import { beforeNavigate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Alert, Button, Card, Helper, Input, Label } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { slugify } from '#lib/slug.ts';
	import RichTextEditor from './RichTextEditor.svelte';
	import StatusBadge from './StatusBadge.svelte';

	type Page = {
		id: string;
		title: string;
		slug: string;
		body: string;
		status: string;
		showInFooter: boolean;
		showInMenu: boolean;
		menuItems: { id: string; label: string; href: string }[];
	};

	let {
		page = null,
		errors = {},
		saved = false
	}: { page?: Page | null; errors?: Record<string, string>; saved?: boolean } = $props();

	// svelte-ignore state_referenced_locally
	const initial = page;
	let title = $state(initial?.title ?? '');
	let slug = $state(initial?.slug ?? '');
	let slugTouched = $state(!!initial);
	let items = $state(
		initial?.menuItems.map((item) => ({
			id: item.id,
			label: item.label,
			href: item.href,
			key: item.id
		})) ?? []
	);
	let dirty = $state(false);
	let saving = $state(false);

	const published = $derived(page?.status === 'published');

	function addItem() {
		items.push({ id: '', label: '', href: '', key: crypto.randomUUID() });
		dirty = true;
	}

	function removeItem(key: string) {
		items = items.filter((item) => item.key !== key);
		dirty = true;
	}

	beforeNavigate((navigation) => {
		if (dirty && !saving && !confirm(m.admin_unsaved_confirm())) navigation.cancel();
	});
</script>

<svelte:window
	onbeforeunload={(event) => {
		if (dirty && !saving) event.preventDefault();
	}}
/>

<form
	method="post"
	action="?/save"
	class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
	oninput={() => (dirty = true)}
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			saving = false;
			if (result.type === 'success' || result.type === 'redirect') dirty = false;
		};
	}}
>
	<div class="space-y-4">
		{#if saved && !dirty}<Alert color="green">{m.admin_saved()}</Alert>{/if}

		<div>
			<Label for="title" class="mb-2">{m.admin_field_title()}</Label>
			<Input
				id="title"
				name="title"
				bind:value={title}
				oninput={() => {
					if (!slugTouched) slug = slugify(title);
				}}
				required
				maxlength={200}
				size="lg"
				color={errors.title ? 'red' : undefined}
			/>
			{#if errors.title}<Helper color="red" class="mt-1">{m.admin_required()}</Helper>{/if}
		</div>

		<div>
			<span class="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
				{m.admin_field_body()}
			</span>
			<RichTextEditor
				name="body"
				value={initial?.body ?? ''}
				label={m.admin_field_body()}
				onchange={() => (dirty = true)}
			/>
		</div>

		<Card size="xl" class="space-y-4 p-4">
			<fieldset class="space-y-2">
				<legend class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
					{m.admin_field_menu()}
				</legend>
				{#each items as item, i (item.key)}
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
						<input type="hidden" name="menuItemId" value={item.id} />
						<Input
							name="menuItemLabel"
							bind:value={item.label}
							maxlength={150}
							aria-label={m.admin_menu_item_n({ n: i + 1 })}
							placeholder={m.admin_menu_label()}
							class="flex-1"
						/>
						<Input
							name="menuItemHref"
							bind:value={item.href}
							maxlength={500}
							aria-label={m.admin_menu_href()}
							placeholder={m.admin_menu_href()}
							class="flex-1"
						/>
						<Button
							type="button"
							color="alternative"
							size="sm"
							onclick={() => removeItem(item.key)}
							aria-label={m.admin_menu_remove()}
							title={m.admin_menu_remove()}
						>
							✕
						</Button>
					</div>
				{/each}
				<Button type="button" color="alternative" size="sm" onclick={addItem}>
					+ {m.admin_menu_add()}
				</Button>
				<Helper>{m.admin_menu_hint()}</Helper>
			</fieldset>
		</Card>
	</div>

	<aside>
		<Card size="xl" class="space-y-4 p-4">
			<div class="flex items-center justify-between gap-2">
				<StatusBadge status={published ? 'published' : 'draft'} />
				{#if page && published}
					<a
						href={resolve('/(site)/[slug]', { slug: page.slug })}
						target="_blank"
						class="text-primary-700 dark:text-primary-400 text-sm hover:underline"
					>
						{m.admin_view()} ↗
					</a>
				{/if}
			</div>

			<div>
				<Label for="slug" class="mb-2">{m.admin_field_slug()}</Label>
				<Input
					id="slug"
					name="slug"
					bind:value={slug}
					oninput={() => (slugTouched = true)}
					maxlength={100}
				/>
				<Helper class="mt-1">/{slug || '…'}</Helper>
			</div>

			<Label class="flex items-center gap-2 font-normal">
				<input
					type="checkbox"
					name="showInFooter"
					class="h-4 w-4 rounded-sm border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
					checked={initial?.showInFooter ?? false}
				/>
				{m.admin_field_show_in_footer()}
			</Label>
			<Label class="flex items-center gap-2 font-normal">
				<input
					type="checkbox"
					name="showInMenu"
					class="h-4 w-4 rounded-sm border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
					checked={initial?.showInMenu ?? false}
				/>
				{m.admin_field_show_in_menu()}
			</Label>

			<div class="flex flex-wrap gap-2">
				<Button type="submit" name="intent" value="publish" disabled={saving}>
					{published ? m.admin_save() : m.admin_publish()}
				</Button>
				<Button type="submit" name="intent" value="draft" color="alternative" disabled={saving}>
					{published ? m.admin_unpublish() : m.admin_save_draft()}
				</Button>
			</div>
		</Card>
	</aside>
</form>

{#if page}
	<form
		method="post"
		action="?/delete"
		class="mt-6"
		use:enhance={({ cancel }) => {
			if (!confirm(m.admin_confirm_delete({ title: page.title }))) return cancel();
			saving = true;
		}}
	>
		<Button type="submit" color="red" outline size="sm">{m.admin_delete()}</Button>
	</form>
{/if}
