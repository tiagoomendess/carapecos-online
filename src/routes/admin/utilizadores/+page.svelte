<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import {
		Alert,
		Badge,
		Button,
		Card,
		Heading,
		Helper,
		Input,
		Label,
		Modal,
		Select
	} from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type User = PageProps['data']['users'][number];

	let creating = $state(false);
	let passwordFor = $state<User | null>(null);

	const roleLabel = (role: string) =>
		role === 'admin' ? m.admin_role_admin() : m.admin_role_editor();

	/** Closes the dialog once the action succeeds */
	const closing =
		(close: () => void): SubmitFunction =>
		() =>
		async ({ result, update }) => {
			await update();
			if (result.type === 'success') close();
		};
</script>

<svelte:head>
	<title>{m.admin_users_title()} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-5xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h1" class="w-auto text-2xl">{m.admin_users_title()}</Heading>
		<Button onclick={() => (creating = true)}>{m.admin_user_new()}</Button>
	</div>
	<p class="text-sm text-gray-500">{m.admin_role_hint()}</p>

	{#if form?.error}<Alert color="red">{form.error}</Alert>{/if}
	{#if form?.message}<Alert color="green">{form.message}</Alert>{/if}

	<ul class="grid gap-3">
		{#each data.users as user (user.id)}
			{@const isMe = user.id === data.me}
			<li>
				<Card size="xl" class="flex flex-wrap items-center justify-between gap-3 p-4 sm:flex-row">
					<div class="min-w-0">
						<p class="font-medium text-gray-900 dark:text-white">
							{user.name}
							{#if isMe}<span class="text-sm text-gray-500">({m.admin_you()})</span>{/if}
						</p>
						<p class="truncate text-sm text-gray-500">{user.email}</p>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						{#if isMe}
							<Badge color="green">{roleLabel(user.role)}</Badge>
						{:else}
							<form method="post" action="?/role" use:enhance>
								<input type="hidden" name="userId" value={user.id} />
								<Select
									name="role"
									value={user.role}
									placeholder=""
									size="sm"
									aria-label={m.admin_field_role()}
									onchange={(event) => event.currentTarget.form?.requestSubmit()}
								>
									<option value="editor">{m.admin_role_editor()}</option>
									<option value="admin">{m.admin_role_admin()}</option>
								</Select>
							</form>
						{/if}
						<Button size="xs" color="alternative" onclick={() => (passwordFor = user)}>
							{m.admin_user_set_password()}
						</Button>
						{#if !isMe}
							<form
								method="post"
								action="?/delete"
								use:enhance={({ cancel }) => {
									if (!confirm(m.admin_confirm_delete({ title: user.name }))) cancel();
								}}
							>
								<input type="hidden" name="userId" value={user.id} />
								<Button type="submit" size="xs" color="red" outline>{m.admin_delete()}</Button>
							</form>
						{/if}
					</div>
				</Card>
			</li>
		{/each}
	</ul>
</main>

<Modal bind:open={creating} title={m.admin_user_new()} size="md">
	<form
		method="post"
		action="?/create"
		class="space-y-4"
		use:enhance={closing(() => (creating = false))}
	>
		<div>
			<Label for="new-name" class="mb-2">{m.admin_name()}</Label>
			<Input id="new-name" name="name" required autocomplete="off" />
		</div>
		<div>
			<Label for="new-email" class="mb-2">{m.admin_email()}</Label>
			<Input id="new-email" name="email" type="email" required autocomplete="off" />
		</div>
		<div>
			<Label for="new-password" class="mb-2">{m.admin_password()}</Label>
			<Input
				id="new-password"
				name="password"
				type="password"
				minlength={8}
				required
				autocomplete="new-password"
			/>
			<Helper class="mt-1">{m.admin_password_hint()}</Helper>
		</div>
		<div>
			<Label for="new-role" class="mb-2">{m.admin_field_role()}</Label>
			<Select id="new-role" name="role" value="editor" placeholder="">
				<option value="editor">{m.admin_role_editor()}</option>
				<option value="admin">{m.admin_role_admin()}</option>
			</Select>
		</div>
		<Button type="submit">{m.admin_create()}</Button>
	</form>
</Modal>

<Modal
	open={!!passwordFor}
	onclose={() => (passwordFor = null)}
	title={m.admin_user_set_password()}
	size="sm"
>
	{#if passwordFor}
		<form
			method="post"
			action="?/password"
			class="space-y-4"
			use:enhance={closing(() => (passwordFor = null))}
		>
			<p class="text-sm text-gray-500">{passwordFor.name} · {passwordFor.email}</p>
			<input type="hidden" name="userId" value={passwordFor.id} />
			<div>
				<Label for="set-password" class="mb-2">{m.admin_user_new_password()}</Label>
				<Input
					id="set-password"
					name="password"
					type="password"
					minlength={8}
					required
					autocomplete="new-password"
				/>
				<Helper class="mt-1">{m.admin_password_hint()}</Helper>
			</div>
			<Button type="submit">{m.admin_save()}</Button>
		</form>
	{/if}
</Modal>
