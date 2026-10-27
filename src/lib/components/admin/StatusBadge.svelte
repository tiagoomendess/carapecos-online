<script lang="ts">
	import { Badge } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { type DisplayStatus } from '#lib/admin/status.ts';

	let { status }: { status: DisplayStatus } = $props();

	const badges = {
		draft: { color: 'gray', label: m.admin_status_draft() },
		scheduled: { color: 'yellow', label: m.admin_status_scheduled() },
		published: { color: 'green', label: m.admin_status_published() }
	} as const;
</script>

<Badge color={badges[status].color}>{badges[status].label}</Badge>
