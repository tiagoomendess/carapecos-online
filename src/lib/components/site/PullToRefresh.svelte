<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { Attachment } from 'svelte/attachments';
	import { m } from '#lib/paraglide/messages.js';

	// Visual travel before a release reloads the page, and the furthest the indicator will follow
	const TRIGGER = 70;
	const MAX = 104;

	let pull = $state(0);
	let dragging = $state(false);
	let refreshing = $state(false);

	const progress = $derived(Math.min(pull / TRIGGER, 1));
	const ready = $derived(refreshing || progress >= 1);
	const opacity = $derived(refreshing ? 1 : Math.min(pull / 32, 1));

	// touchmove has to be non-passive so a pull at the top of the page can cancel the browser's
	// own reload gesture. The listener is attached once and does not read component state.
	const watch: Attachment<HTMLDivElement> = () => {
		let startX = 0;
		let startY = 0;
		let tracking = false;
		let active = false;
		let busy = false;
		let alive = true;
		let suppressClick = false;
		let clickTimer: ReturnType<typeof setTimeout> | undefined;
		const ac = new AbortController();
		const signal = ac.signal;

		const root = document.documentElement;
		const previousOverscroll = root.style.overscrollBehaviorY;
		root.style.overscrollBehaviorY = 'none';

		function armSuppressClick() {
			suppressClick = true;
			clearTimeout(clickTimer);
			clickTimer = setTimeout(() => {
				suppressClick = false;
			}, 400);
		}

		function onClickCapture(event: Event) {
			if (!suppressClick) return;
			suppressClick = false;
			clearTimeout(clickTimer);
			event.preventDefault();
			event.stopPropagation();
		}

		function blockedTarget(target: EventTarget | null) {
			if (!(target instanceof Element)) return false;
			if (target.closest('input, textarea, select, [contenteditable="true"], :popover-open')) {
				return true;
			}
			for (let el: Element | null = target; el && el !== document.body; el = el.parentElement) {
				const { overflowY } = getComputedStyle(el);
				if (/(auto|scroll)/.test(overflowY) && el.scrollHeight > el.clientHeight + 1) return true;
			}
			return false;
		}

		function release() {
			tracking = false;
			active = false;
			dragging = false;
			if (!busy) pull = 0;
		}

		function onStart(event: TouchEvent) {
			if (busy || event.touches.length !== 1 || window.scrollY > 0) return;
			if (blockedTarget(event.target)) return;
			startX = event.touches[0].clientX;
			startY = event.touches[0].clientY;
			tracking = true;
			active = false;
		}

		function onMove(event: TouchEvent) {
			if (!tracking || busy) return;
			if (event.touches.length !== 1) {
				release();
				return;
			}
			const dx = event.touches[0].clientX - startX;
			const dy = event.touches[0].clientY - startY;

			if (!active) {
				if (dx * dx + dy * dy < 64) return;
				if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || window.scrollY > 0) {
					tracking = false;
					return;
				}
				active = true;
				dragging = true;
			}

			if (dy <= 0 || window.scrollY > 0) {
				release();
				return;
			}

			if (event.cancelable) event.preventDefault();
			pull = Math.min(MAX, dy * 0.55);
		}

		async function onEnd() {
			const shouldRefresh = active && pull >= TRIGGER && !busy;
			if (active) armSuppressClick();
			tracking = false;
			active = false;
			dragging = false;
			if (!shouldRefresh) {
				if (!busy) pull = 0;
				return;
			}

			busy = true;
			refreshing = true;
			pull = TRIGGER;
			try {
				await invalidateAll();
			} finally {
				busy = false;
				if (!alive) return;
				refreshing = false;
				pull = 0;
			}
		}

		document.addEventListener('touchstart', onStart, { passive: true, signal });
		document.addEventListener('touchmove', onMove, { passive: false, signal });
		document.addEventListener('touchend', onEnd, { passive: true, signal });
		document.addEventListener('touchcancel', release, { passive: true, signal });
		document.addEventListener('click', onClickCapture, { capture: true, signal });

		return () => {
			alive = false;
			clearTimeout(clickTimer);
			ac.abort();
			root.style.overscrollBehaviorY = previousOverscroll;
		};
	};
</script>

<div
	{@attach watch}
	class={['badge', { tracking: dragging }]}
	style:--pull="{pull}px"
	style:opacity
	aria-hidden={opacity === 0}
>
	<div class={['disc', 'glass', { ready, refreshing }]}>
		<svg class="ring" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
			<circle
				cx="12"
				cy="12"
				r="8"
				pathLength="1"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-dasharray={refreshing ? '0.28 1' : `${progress} 1`}
				transform="rotate(-90 12 12)"
			/>
		</svg>
	</div>
	<div class="sr-only" role="status">{refreshing ? m.pull_refreshing() : ''}</div>
</div>

<style>
	.badge {
		position: fixed;
		z-index: 25;
		left: 50%;
		top: calc(env(safe-area-inset-top) + var(--header-h));
		translate: -50% calc(var(--pull) - 100% - 0.35rem);
		pointer-events: none;
		transition:
			translate 280ms var(--ease-out),
			opacity 180ms var(--ease-out);
	}

	.badge.tracking {
		transition: none;
	}

	.disc {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		place-items: center;
		border-radius: 999px;
		color: var(--text);
	}

	.disc.ready {
		color: var(--accent);
	}

	.refreshing .ring {
		animation: spin 0.75s linear infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		.badge {
			transition: none;
		}

		.refreshing .ring {
			animation: none;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
