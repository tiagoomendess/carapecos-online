<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { m } from '#lib/paraglide/messages.js';
	import { toastDuration, toastEvent } from '#lib/toast.ts';
	import Icon from './Icon.svelte';

	type Notice = {
		id: number;
		message: string;
		remaining: number;
		offset: number;
		dragging: boolean;
		leaving: boolean;
	};

	let notices = $state<Notice[]>([]);
	let seq = 0;

	const timers = new SvelteMap<number, ReturnType<typeof setTimeout>>();
	const deadlines = new SvelteMap<number, number>();
	const removals = new SvelteSet<ReturnType<typeof setTimeout>>();
	const paused = new SvelteSet<number>();

	function clearTimer(id: number) {
		const timer = timers.get(id);
		if (timer !== undefined) clearTimeout(timer);
		timers.delete(id);
		deadlines.delete(id);
	}

	function arm(id: number, ms: number) {
		clearTimer(id);
		deadlines.set(id, Date.now() + ms);
		timers.set(
			id,
			setTimeout(() => dismiss(id), ms)
		);
	}

	function show(message: string) {
		const id = ++seq;
		const remaining = toastDuration(message);
		notices.unshift({
			id,
			message,
			remaining,
			offset: 0,
			dragging: false,
			leaving: false
		});
		arm(id, remaining);
	}

	function dismiss(id: number) {
		const notice = notices.find((item) => item.id === id);
		if (!notice || notice.leaving) return;
		clearTimer(id);
		paused.delete(id);
		notice.leaving = true;
		const removal = setTimeout(() => {
			removals.delete(removal);
			notices = notices.filter((item) => item.id !== id);
		}, 180);
		removals.add(removal);
	}

	function pause(id: number) {
		const notice = notices.find((item) => item.id === id);
		const deadline = deadlines.get(id);
		if (!notice || notice.leaving || paused.has(id) || deadline === undefined) return;
		notice.remaining = Math.max(0, deadline - Date.now());
		paused.add(id);
		clearTimer(id);
	}

	function resume(id: number) {
		const notice = notices.find((item) => item.id === id);
		if (!notice || notice.leaving || !paused.has(id)) return;
		if (hovering.has(id) || focused.has(id) || drag?.id === id) return;
		paused.delete(id);
		arm(id, notice.remaining);
	}

	const listen: Attachment<HTMLDivElement> = () => {
		const onToast = (event: Event) => {
			const message = (event as CustomEvent<string>).detail;
			if (typeof message === 'string' && message) show(message);
		};
		document.addEventListener(toastEvent, onToast);
		return () => {
			document.removeEventListener(toastEvent, onToast);
			for (const timer of timers.values()) clearTimeout(timer);
			for (const timer of removals) clearTimeout(timer);
			timers.clear();
			deadlines.clear();
			removals.clear();
		};
	};

	let drag: { id: number; startY: number } | null = null;
	const hovering = new SvelteSet<number>();
	const focused = new SvelteSet<number>();

	function onPointerDown(event: PointerEvent, id: number) {
		if (event.button !== 0) return;
		const target = event.target;
		if (target instanceof Element && target.closest('button')) return;
		const notice = notices.find((item) => item.id === id);
		if (!notice || notice.leaving) return;
		pause(id);
		drag = { id, startY: event.clientY };
		notice.dragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent, id: number) {
		if (drag?.id !== id) return;
		const notice = notices.find((item) => item.id === id);
		if (!notice) return;
		notice.offset = Math.min(0, event.clientY - drag.startY);
	}

	function onPointerUp(event: PointerEvent, id: number) {
		if (drag?.id !== id) return;
		const notice = notices.find((item) => item.id === id);
		drag = null;
		if (!notice || notice.leaving) return;
		notice.dragging = false;
		if (notice.offset < -36) {
			dismiss(id);
			return;
		}
		notice.offset = 0;
		// A touch lift does not always emit pointerleave, which would leave the timer paused
		if (event.pointerType === 'touch') hovering.delete(id);
		resume(id);
	}

	function hold(id: number) {
		hovering.add(id);
		pause(id);
	}

	function release(id: number) {
		hovering.delete(id);
		if (drag?.id === id) return;
		resume(id);
	}

	function focus(id: number) {
		focused.add(id);
		pause(id);
	}

	function blur(id: number) {
		focused.delete(id);
		resume(id);
	}
</script>

<div {@attach listen} class="stack">
	{#each notices as notice (notice.id)}
		<div
			class={['toast', 'glass', { dragging: notice.dragging, leaving: notice.leaving }]}
			style:--drag="{notice.offset}px"
			role="status"
			onpointerdown={(event) => onPointerDown(event, notice.id)}
			onpointermove={(event) => onPointerMove(event, notice.id)}
			onpointerup={(event) => onPointerUp(event, notice.id)}
			onpointercancel={(event) => onPointerUp(event, notice.id)}
			onpointerenter={() => hold(notice.id)}
			onpointerleave={() => release(notice.id)}
			onfocusin={() => focus(notice.id)}
			onfocusout={() => blur(notice.id)}
		>
			<span class="mark"><Icon name="check" size={18} /></span>
			<p>{notice.message}</p>
			<button
				type="button"
				class="close pressable"
				aria-label={m.toast_dismiss()}
				onclick={() => dismiss(notice.id)}
			>
				<Icon name="close" size={16} />
			</button>
		</div>
	{/each}
</div>

<style>
	.stack {
		position: fixed;
		z-index: 50;
		top: calc(env(safe-area-inset-top) + var(--header-h) + 0.5rem);
		left: 50%;
		translate: -50% 0;
		display: grid;
		gap: 0.5rem;
		width: min(24rem, calc(100vw - 2 * var(--gutter)));
		pointer-events: none;
	}

	.toast {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.75rem 0.5rem 0.75rem 0.875rem;
		border-radius: 1rem;
		color: var(--text);
		pointer-events: auto;
		touch-action: none;
		transform: translateY(var(--drag));
		animation: toast-in 220ms var(--ease-out);
	}

	.toast.dragging {
		transition: none;
	}

	.toast.leaving {
		opacity: 0;
		translate: 0 -0.5rem;
		transition:
			opacity 160ms var(--ease-out),
			translate 160ms var(--ease-out);
	}

	.mark {
		display: grid;
		flex: none;
		margin-top: 0.1rem;
		color: var(--accent);
	}

	p {
		flex: 1;
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		line-height: 1.35;
		letter-spacing: -0.01em;
	}

	.close {
		display: grid;
		flex: none;
		width: 2rem;
		height: 2rem;
		place-items: center;
		border-radius: 999px;
		color: var(--text-2);
	}

	@media (hover: hover) and (pointer: fine) {
		.close:hover {
			color: var(--text);
			background: var(--accent-soft);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation: none;
		}

		.toast.leaving {
			translate: none;
			transition: opacity 160ms var(--ease-out);
		}
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			translate: 0 -0.6rem;
		}
	}
</style>
