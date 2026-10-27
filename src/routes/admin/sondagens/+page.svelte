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
	import { formatListDate } from '#lib/format.ts';
	import { displayStatus } from '#lib/admin/status.ts';
	import StatusBadge from '#lib/components/admin/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const now = new Date();
</script>

<svelte:head>
	<title>{m.admin_polls_title()} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-6xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h1" class="w-auto text-2xl">{m.admin_polls_title()}</Heading>
		<Button href={resolve('/admin/sondagens/nova')}>{m.admin_poll_new()}</Button>
	</div>

	<Table hoverable class="bg-white dark:bg-gray-800">
		<TableHead>
			<TableHeadCell>{m.admin_field_question()}</TableHeadCell>
			<TableHeadCell>{m.admin_status()}</TableHeadCell>
			<TableHeadCell class="hidden sm:table-cell">{m.admin_column_date()}</TableHeadCell>
			<TableHeadCell class="text-right">{m.admin_column_voters()}</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each data.polls as poll (poll.id)}
				<TableBodyRow>
					<TableBodyCell class="max-w-md whitespace-normal">
						<a
							href={resolve('/admin/sondagens/[id]', { id: poll.id })}
							class="font-medium text-gray-900 hover:underline dark:text-white"
						>
							{poll.question}
						</a>
						{#if poll.closesAt && poll.closesAt <= now}
							<span class="ms-1 text-xs text-gray-500">· {m.admin_poll_closed()}</span>
						{/if}
					</TableBodyCell>
					<TableBodyCell>
						<StatusBadge status={displayStatus(poll.status, poll.publishedAt)} />
					</TableBodyCell>
					<TableBodyCell class="hidden sm:table-cell">
						{poll.publishedAt ? formatListDate(poll.publishedAt) : '—'}
					</TableBodyCell>
					<TableBodyCell class="text-right tabular-nums">{poll.voters}</TableBodyCell>
				</TableBodyRow>
			{:else}
				<TableBodyRow>
					<TableBodyCell colspan={4} class="text-center text-gray-500"
						>{m.admin_none()}</TableBodyCell
					>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
</main>
