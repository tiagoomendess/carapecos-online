<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Button, Card, Heading, Helper, Input, Label, P } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.admin_setup_title()} · {m.site_name()}</title>
</svelte:head>

<main class="grid min-h-dvh place-items-center p-4">
	<Card size="md" class="w-full p-6">
		<Heading tag="h1" class="mb-2 text-xl">{m.admin_setup_title()}</Heading>
		<P class="mb-6 text-sm text-gray-500">{m.admin_setup_intro()}</P>
		<form method="post" use:enhance class="space-y-4">
			{#if form?.message}
				<Alert color="red">{form.message}</Alert>
			{/if}
			<div>
				<Label for="name" class="mb-2">{m.admin_name()}</Label>
				<Input id="name" name="name" autocomplete="name" required value={form?.name ?? ''} />
			</div>
			<div>
				<Label for="email" class="mb-2">{m.admin_email()}</Label>
				<Input
					id="email"
					name="email"
					type="email"
					autocomplete="username"
					required
					value={form?.email ?? ''}
				/>
			</div>
			<div>
				<Label for="password" class="mb-2">{m.admin_password()}</Label>
				<Input
					id="password"
					name="password"
					type="password"
					autocomplete="new-password"
					minlength={8}
					required
				/>
				<Helper class="mt-2">{m.admin_password_hint()}</Helper>
			</div>
			<Button type="submit" class="w-full">{m.admin_setup_submit()}</Button>
		</form>
	</Card>
</main>
