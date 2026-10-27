<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import {
		Alert,
		Button,
		Card,
		Checkbox,
		Helper,
		Input,
		Label,
		Progressbar
	} from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { toLisbonInput } from '#lib/format.ts';
	import { slugify } from '#lib/slug.ts';
	import { displayStatus } from '#lib/admin/status.ts';
	import StatusBadge from './StatusBadge.svelte';

	type Poll = {
		id: string;
		question: string;
		slug: string;
		multipleChoice: boolean;
		status: string;
		publishedAt: Date | null;
		closesAt: Date | null;
		options: { id: string; label: string; votes: number }[];
		voters: number;
	};

	let {
		poll = null,
		errors = {},
		saved = false
	}: { poll?: Poll | null; errors?: Record<string, string>; saved?: boolean } = $props();

	// svelte-ignore state_referenced_locally
	const initial = poll;
	let question = $state(initial?.question ?? '');
	let slug = $state(initial?.slug ?? '');
	let slugTouched = $state(!!initial);
	let options = $state(
		initial?.options.map((o) => ({ id: o.id, label: o.label, votes: o.votes, key: o.id })) ?? [
			{ id: '', label: '', votes: 0, key: crypto.randomUUID() },
			{ id: '', label: '', votes: 0, key: crypto.randomUUID() }
		]
	);
	let dirty = $state(false);
	let saving = $state(false);

	const status = $derived(poll ? displayStatus(poll.status, poll.publishedAt) : 'draft');
	const closed = $derived(!!poll?.closesAt && poll.closesAt <= new Date());
	const totalVotes = $derived(poll?.options.reduce((sum, o) => sum + o.votes, 0) ?? 0);

	function addOption() {
		options.push({ id: '', label: '', votes: 0, key: crypto.randomUUID() });
		dirty = true;
	}

	function removeOption(key: string) {
		options = options.filter((o) => o.key !== key);
		dirty = true;
	}

	beforeNavigate((navigation) => {
		if (dirty && !saving && !confirm(m.admin_unsaved_confirm())) navigation.cancel();
	});
</script>

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

		<Card size="xl" class="space-y-4 p-4">
			<div>
				<Label for="question" class="mb-2">{m.admin_field_question()}</Label>
				<Input
					id="question"
					name="question"
					bind:value={question}
					oninput={() => {
						if (!slugTouched) slug = slugify(question);
					}}
					required
					maxlength={200}
					size="lg"
					color={errors.question ? 'red' : undefined}
				/>
				{#if errors.question}<Helper color="red" class="mt-1">{m.admin_required()}</Helper>{/if}
			</div>

			<fieldset class="space-y-2">
				<legend class="mb-2 text-sm font-medium text-gray-900 dark:text-white">
					{m.admin_field_options()}
				</legend>
				{#each options as option, i (option.key)}
					<div class="flex items-center gap-2">
						<input type="hidden" name="optionId" value={option.id} />
						<Input
							name="optionLabel"
							bind:value={option.label}
							maxlength={150}
							aria-label={m.admin_poll_option_n({ n: i + 1 })}
							placeholder={m.admin_poll_option_n({ n: i + 1 })}
							class="flex-1"
						/>
						{#if poll}
							<span class="w-14 text-right text-sm text-gray-500 tabular-nums">{option.votes}</span>
						{/if}
						<Button
							type="button"
							color="alternative"
							size="sm"
							disabled={options.length <= 2}
							onclick={() => removeOption(option.key)}
							aria-label={m.admin_poll_remove_option()}
							title={m.admin_poll_remove_option()}
						>
							✕
						</Button>
					</div>
				{/each}
				<Button type="button" color="alternative" size="sm" onclick={addOption}>
					+ {m.admin_poll_add_option()}
				</Button>
				<Helper color={errors.options ? 'red' : undefined}>
					{errors.options ? m.admin_poll_min_options() : m.admin_poll_options_hint()}
				</Helper>
			</fieldset>

			<Checkbox name="multipleChoice" checked={initial?.multipleChoice ?? false}>
				{m.admin_field_multiple_choice()}
			</Checkbox>
		</Card>

		{#if poll}
			<Card size="xl" class="space-y-3 p-4">
				<h2 class="font-semibold text-gray-900 dark:text-white">{m.admin_poll_results()}</h2>
				<p class="text-sm text-gray-500">
					{m.admin_poll_voters({ count: poll.voters })}{closed ? ` · ${m.admin_poll_closed()}` : ''}
				</p>
				{#each poll.options as option (option.id)}
					{@const value = totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0}
					<div>
						<div class="mb-1 flex justify-between text-sm">
							<span class="text-gray-900 dark:text-white">{option.label}</span>
							<span class="text-gray-500 tabular-nums">{option.votes} · {value}%</span>
						</div>
						<Progressbar progress={value} size="h-2" />
					</div>
				{/each}
			</Card>
		{/if}
	</div>

	<aside>
		<Card size="xl" class="space-y-4 p-4">
			<div class="flex items-center justify-between gap-2">
				<StatusBadge {status} />
				{#if poll && status === 'published'}
					<a
						href={resolve('/(site)/sondagens/[slug]', { slug: poll.slug })}
						target="_blank"
						class="text-primary-700 dark:text-primary-400 text-sm hover:underline"
					>
						{m.admin_view()} ↗
					</a>
				{/if}
			</div>

			<div>
				<Label for="publishedAt" class="mb-2">{m.admin_field_published_at()}</Label>
				<Input
					id="publishedAt"
					name="publishedAt"
					type="datetime-local"
					value={initial?.publishedAt ? toLisbonInput(initial.publishedAt) : ''}
					color={errors.publishedAt ? 'red' : undefined}
				/>
				<Helper class="mt-1">{m.admin_field_published_at_hint()}</Helper>
			</div>

			<div>
				<Label for="closesAt" class="mb-2">{m.admin_field_closes_at()}</Label>
				<Input
					id="closesAt"
					name="closesAt"
					type="datetime-local"
					value={initial?.closesAt ? toLisbonInput(initial.closesAt) : ''}
					color={errors.closesAt ? 'red' : undefined}
				/>
				<Helper class="mt-1">{m.admin_field_closes_at_hint()}</Helper>
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
				<Helper class="mt-1">/sondagens/{slug || '…'}</Helper>
			</div>

			<div class="flex flex-wrap gap-2">
				<Button type="submit" name="intent" value="publish" disabled={saving}>
					{status === 'draft' ? m.admin_publish() : m.admin_save()}
				</Button>
				<Button type="submit" name="intent" value="draft" color="alternative" disabled={saving}>
					{status === 'draft' ? m.admin_save_draft() : m.admin_unpublish()}
				</Button>
			</div>
			<Helper>{m.admin_poll_embed_hint()}</Helper>
		</Card>
	</aside>
</form>

{#if poll}
	<form
		method="post"
		action="?/delete"
		class="mt-6"
		use:enhance={({ cancel }) => {
			if (!confirm(m.admin_confirm_delete({ title: poll.question }))) return cancel();
			saving = true;
		}}
	>
		<Button type="submit" color="red" outline size="sm">{m.admin_delete()}</Button>
	</form>
{/if}
