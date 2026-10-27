<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge, Button, Card, Heading } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.admin_messages_title()} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-4xl space-y-4 p-4">
	<Heading tag="h1" class="text-2xl">{m.admin_messages_title()}</Heading>

	{#if data.messages.length}
		<ul class="grid gap-3">
			{#each data.messages as message (message.id)}
				<li>
					<Card size="xl" class={['space-y-2 p-4', !message.readAt && 'border-primary-400']}>
						<div class="flex flex-wrap items-center gap-2 text-sm">
							<span class="font-semibold text-gray-900 dark:text-white">{message.name}</span>
							<span class="text-gray-500">{message.email}</span>
							<span class="text-gray-500">· {formatDateTime(message.createdAt)}</span>
							{#if !message.readAt}<Badge color="green">{m.admin_message_unread()}</Badge>{/if}
						</div>
						<p class="text-sm whitespace-pre-line text-gray-700 dark:text-gray-200">
							{message.message}
						</p>
						<div class="flex flex-wrap gap-2">
							<Button
								size="xs"
								href="mailto:{message.email}?subject={encodeURIComponent(m.site_name())}"
							>
								{m.admin_message_reply()}
							</Button>
							<form method="post" action="?/read" use:enhance>
								<input type="hidden" name="id" value={message.id} />
								<input type="hidden" name="read" value={message.readAt ? '0' : '1'} />
								<Button type="submit" size="xs" color="alternative">
									{message.readAt ? m.admin_message_mark_unread() : m.admin_message_mark_read()}
								</Button>
							</form>
							<form
								method="post"
								action="?/delete"
								use:enhance={({ cancel }) => {
									if (!confirm(m.admin_message_confirm_delete())) cancel();
								}}
							>
								<input type="hidden" name="id" value={message.id} />
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
</main>
