<script lang="ts">
	import { resolve } from '$app/paths';
	import { beforeNavigate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import {
		Alert,
		Button,
		Card,
		Checkbox,
		Helper,
		Input,
		Label,
		Select,
		Textarea
	} from 'flowbite-svelte';
	import { VAPID_PUBLIC_KEY } from '$app/env/public';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime, toLisbonInput } from '#lib/format.ts';
	import { slugify } from '#lib/slug.ts';
	import { displayStatus } from '#lib/admin/status.ts';
	import type { MediaRef } from '#lib/admin/image.ts';
	import CoverField from './CoverField.svelte';
	import RichTextEditor from './RichTextEditor.svelte';
	import StatusBadge from './StatusBadge.svelte';

	type Article = {
		id: string;
		title: string;
		slug: string;
		lead: string | null;
		body: string;
		categoryId: string;
		status: string;
		publishedAt: Date | null;
		updatedAt: Date;
		featured: boolean;
		sendPush: boolean;
		pushSentAt: Date | null;
		cover: MediaRef | null;
	};

	let {
		article = null,
		categories,
		errors = {},
		saved = false
	}: {
		article?: Article | null;
		categories: { id: string; name: string }[];
		errors?: Record<string, string>;
		saved?: boolean;
	} = $props();

	// Form state starts from the article; after that the form owns it
	// svelte-ignore state_referenced_locally
	const initial = article;
	let title = $state(initial?.title ?? '');
	let slug = $state(initial?.slug ?? '');
	// New articles get their address from the title until it's edited by hand
	let slugTouched = $state(!!initial);
	let cover = $state(initial?.cover ?? null);
	let dirty = $state(false);
	let saving = $state(false);

	const pushEnabled = !!VAPID_PUBLIC_KEY;

	const status = $derived(
		article ? displayStatus(article.status, article.publishedAt) : ('draft' as const)
	);

	function onTitle() {
		if (!slugTouched) slug = slugify(title);
	}

	const errorText = (code: string | undefined) =>
		code === 'required'
			? m.admin_required()
			: code === 'too_long'
				? m.admin_too_long()
				: code
					? m.admin_invalid()
					: undefined;

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
		{#if saved && !dirty}
			<Alert color="green">{m.admin_saved()}</Alert>
		{/if}
		{#if Object.keys(errors).length}
			<Alert color="red">{m.admin_fix_errors()}</Alert>
		{/if}

		<div>
			<Label for="title" class="mb-2">{m.admin_field_title()}</Label>
			<Input
				id="title"
				name="title"
				bind:value={title}
				oninput={onTitle}
				required
				maxlength={200}
				size="lg"
				class="text-lg font-semibold"
				color={errors.title ? 'red' : undefined}
			/>
			{#if errors.title}<Helper color="red" class="mt-1">{errorText(errors.title)}</Helper>{/if}
		</div>

		<div>
			<Label for="lead" class="mb-2">{m.admin_field_lead()}</Label>
			<Textarea
				id="lead"
				name="lead"
				rows={3}
				maxlength={400}
				value={initial?.lead ?? ''}
				class="w-full"
			/>
			<Helper class="mt-1" color={errors.lead ? 'red' : undefined}>
				{errorText(errors.lead) ?? m.admin_field_lead_hint()}
			</Helper>
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
	</div>

	<aside class="space-y-4">
		<Card size="xl" class="space-y-4 p-4">
			<div class="flex items-center justify-between gap-2">
				<StatusBadge {status} />
				{#if article && status === 'published'}
					<a
						href={resolve('/(site)/noticias/[slug]', { slug: article.slug })}
						target="_blank"
						class="text-primary-700 dark:text-primary-400 text-sm hover:underline"
					>
						{m.admin_view()} ↗
					</a>
				{/if}
			</div>
			{#if article}
				<p class="text-xs text-gray-500">
					{m.admin_last_edited({ date: formatDateTime(article.updatedAt) })}
				</p>
			{/if}

			<div>
				<Label for="publishedAt" class="mb-2">{m.admin_field_published_at()}</Label>
				<Input
					id="publishedAt"
					name="publishedAt"
					type="datetime-local"
					value={initial?.publishedAt ? toLisbonInput(initial.publishedAt) : ''}
					color={errors.publishedAt ? 'red' : undefined}
				/>
				<Helper class="mt-1" color={errors.publishedAt ? 'red' : undefined}>
					{errorText(errors.publishedAt) ?? m.admin_field_published_at_hint()}
				</Helper>
			</div>

			<div class="flex flex-wrap gap-2">
				{#if status === 'draft'}
					<Button type="submit" name="intent" value="publish" disabled={saving}>
						{m.admin_publish()}
					</Button>
					<Button type="submit" name="intent" value="draft" color="alternative" disabled={saving}>
						{m.admin_save_draft()}
					</Button>
				{:else}
					<Button type="submit" name="intent" value="publish" disabled={saving}>
						{m.admin_save()}
					</Button>
					<Button type="submit" name="intent" value="draft" color="alternative" disabled={saving}>
						{m.admin_unpublish()}
					</Button>
				{/if}
			</div>
		</Card>

		<Card size="xl" class="space-y-4 p-4">
			<div>
				<Label for="categoryId" class="mb-2">{m.admin_field_category()}</Label>
				<Select
					id="categoryId"
					name="categoryId"
					value={initial?.categoryId ?? ''}
					required
					placeholder="—"
					color={errors.categoryId ? 'red' : undefined}
				>
					{#each categories as category (category.id)}
						<option value={category.id}>{category.name}</option>
					{/each}
				</Select>
				{#if errors.categoryId}
					<Helper color="red" class="mt-1">{errorText(errors.categoryId)}</Helper>
				{/if}
			</div>

			<CoverField bind:cover />

			<div>
				<Checkbox name="featured" checked={initial?.featured ?? false}>
					{m.admin_field_featured()}
				</Checkbox>
				<Helper class="mt-1 ps-6">{m.admin_field_featured_hint()}</Helper>
			</div>
			<div>
				<Checkbox name="sendPush" checked={initial?.sendPush ?? false} disabled={!pushEnabled}>
					{m.admin_field_send_push()}
				</Checkbox>
				{#if !pushEnabled}
					<Helper class="mt-1 ps-6">{m.admin_push_disabled()}</Helper>
				{:else if article?.pushSentAt}
					<Helper class="mt-1 ps-6">
						{m.admin_push_sent({ date: formatDateTime(article.pushSentAt) })}
					</Helper>
				{:else if article?.sendPush && status === 'published'}
					<Helper class="mt-1 ps-6">{m.admin_push_sending()}</Helper>
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
				<Helper class="mt-1">/noticias/{slug || '…'} · {m.admin_field_slug_hint()}</Helper>
			</div>
		</Card>
	</aside>
</form>

{#if article}
	<form
		method="post"
		action="?/delete"
		class="mt-6"
		use:enhance={({ cancel }) => {
			if (!confirm(m.admin_confirm_delete({ title: article.title }))) return cancel();
			saving = true;
		}}
	>
		<Button type="submit" color="red" outline size="sm">{m.admin_delete()}</Button>
	</form>
{/if}
