<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { NavPage } from '#lib/types.ts';
	import Icon from './Icon.svelte';

	let { pages }: { pages: NavPage[] } = $props();

	const uid = $props.id();
	const panelId = `${uid}-panel`;

	let open = $state(false);
	let panelEl: HTMLDivElement | undefined;

	/** Popover light-dismiss runs on pointerdown; the same gesture's pointerup/click would hit the page. */
	const clickThroughGuardMs = 350;
	let clickThroughTimer: ReturnType<typeof setTimeout> | undefined;

	function swallowClickThrough(event: Event) {
		event.preventDefault();
		event.stopPropagation();
	}

	function disarmClickThroughGuard() {
		document.removeEventListener('click', swallowClickThrough, true);
		document.removeEventListener('pointerup', swallowClickThrough, true);
		if (clickThroughTimer !== undefined) {
			clearTimeout(clickThroughTimer);
			clickThroughTimer = undefined;
		}
	}

	function armClickThroughGuard() {
		disarmClickThroughGuard();
		document.addEventListener('click', swallowClickThrough, true);
		document.addEventListener('pointerup', swallowClickThrough, true);
		clickThroughTimer = setTimeout(disarmClickThroughGuard, clickThroughGuardMs);
	}

	function onOutsidePointerDown(event: PointerEvent) {
		const target = event.target;
		if (!(target instanceof Node)) return;
		if (panelEl?.contains(target)) return;
		if (target instanceof Element && target.closest(`[popovertarget="${CSS.escape(panelId)}"]`)) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		armClickThroughGuard();
		panelEl?.hidePopover();
	}

	const bindPanel = (node: HTMLDivElement) => {
		panelEl = node;
		return () => {
			panelEl = undefined;
			document.removeEventListener('pointerdown', onOutsidePointerDown, true);
			disarmClickThroughGuard();
		};
	};

	function onToggle(event: ToggleEvent) {
		open = event.newState === 'open';
		if (open) {
			disarmClickThroughGuard();
			document.addEventListener('pointerdown', onOutsidePointerDown, true);
			panelEl?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
			return;
		}
		document.removeEventListener('pointerdown', onOutsidePointerDown, true);
		armClickThroughGuard();
	}
</script>

{#if pages.length}
	<div class="wrap" data-open={open ? 'true' : 'false'}>
		<button
			type="button"
			class="trigger glass pressable grid size-11 place-items-center rounded-full"
			popovertarget={panelId}
			aria-expanded={open}
			aria-haspopup="menu"
			aria-label={open ? m.nav_menu_close() : m.nav_menu()}
			title={open ? m.nav_menu_close() : m.nav_menu()}
		>
			<span class="icons">
				<span class="icon-menu"><Icon name="menu" /></span>
				<span class="icon-close"><Icon name="close" /></span>
			</span>
		</button>

		<!-- popover top layer escapes the sticky header, which would otherwise clip this panel -->
		<div
			{@attach bindPanel}
			id={panelId}
			class="panel glass"
			popover="auto"
			role="menu"
			aria-label={m.nav_menu()}
			ontoggle={onToggle}
		>
			<div class="group">
				{#each pages as page (page.id)}
					<!-- CMS paths; already classified on the server -->
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={page.href} class={['item', 'pressable']} role="menuitem">
						{page.label}
					</a>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.wrap {
		position: relative;
	}

	.icons {
		display: grid;
		place-items: center;
	}

	.icon-menu,
	.icon-close {
		grid-area: 1 / 1;
		transition: opacity 160ms var(--ease-out);
	}

	.icon-close {
		opacity: 0;
	}

	.wrap[data-open='true'] .icon-menu {
		opacity: 0;
	}

	.wrap[data-open='true'] .icon-close {
		opacity: 1;
	}

	.panel {
		inset: unset;
		margin: 0;
		top: calc(env(safe-area-inset-top) + var(--header-h));
		left: max(var(--gutter), env(safe-area-inset-left));
		min-width: 16rem;
		max-width: min(20.5rem, calc(100vw - 2 * var(--gutter)));
		max-height: min(70dvh, 24rem);
		overflow: auto;
		overscroll-behavior: contain;
		padding: 0.75rem;
		border-radius: var(--radius-card);
		/* Heavier than header chrome so the menu reads as a layer, not a stain on the page */
		background: light-dark(rgb(255 255 255 / 0.92), rgb(21 35 56 / 0.94));
		transform-origin: top left;
		opacity: 1;
		transform: scale(1);
		transition:
			opacity 200ms var(--ease-out),
			transform 200ms var(--ease-out),
			display 200ms var(--ease-out) allow-discrete,
			overlay 200ms var(--ease-out) allow-discrete;
	}

	.panel::backdrop {
		pointer-events: auto;
		background: light-dark(rgb(0 0 0 / 0.18), rgb(0 0 0 / 0.4));
		transition: opacity 180ms var(--ease-out);
	}

	@starting-style {
		.panel:popover-open {
			opacity: 0;
			transform: scale(0.96);
		}

		.panel:popover-open::backdrop {
			opacity: 0;
		}
	}

	/* Solid inset group on glass — stacking two glass layers kills contrast */
	.group {
		overflow: hidden;
		border-radius: 0.875rem;
		background: var(--surface);
	}

	.item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 1rem;
		color: var(--text);
		font-size: 1.0625rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		line-height: 1.3;
		text-decoration: none;
	}

	.item + .item::before {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		left: 1rem;
		height: 1px;
		background: var(--separator);
	}

	@media (hover: hover) and (pointer: fine) {
		.item:hover {
			background: var(--surface-2);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.icon-menu,
		.icon-close {
			transition: none;
		}

		.panel {
			transform: none;
			transition: opacity 200ms var(--ease-out);
		}

		@starting-style {
			.panel:popover-open {
				transform: none;
			}
		}
	}
</style>
