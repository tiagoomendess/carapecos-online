<script lang="ts">
	import './admin.css';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Button,
		NavBrand,
		Navbar,
		Sidebar,
		SidebarGroup,
		SidebarItem,
		SidebarWrapper
	} from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let sidebarOpen = $state(false);

	afterNavigate(() => {
		sidebarOpen = false;
	});

	function closeDrawer() {
		sidebarOpen = false;
	}

	function closeDrawerIfWide() {
		if (window.innerWidth >= 768) sidebarOpen = false;
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') sidebarOpen = false;
	}

	const isAdmin = $derived(data.user?.role === 'admin');

	const contentLinks = $derived([
		{ href: '/admin', label: m.admin_nav_dashboard() },
		{ href: '/admin/artigos', label: m.admin_nav_articles() },
		{ href: '/admin/sondagens', label: m.admin_nav_polls() },
		{ href: '/admin/paginas', label: m.admin_nav_pages() },
		{ href: '/admin/multimedia', label: m.admin_nav_media() }
	]);

	const moderationLinks = $derived([
		{ href: '/admin/comentarios', label: m.admin_nav_comments() },
		...(isAdmin ? [{ href: '/admin/mensagens', label: m.admin_nav_messages() }] : [])
	]);

	const settingsLinks = $derived(
		isAdmin
			? [
					{ href: '/admin/categorias', label: m.admin_nav_categories() },
					{ href: '/admin/utilizadores', label: m.admin_nav_users() }
				]
			: []
	);

	const sections = $derived([...contentLinks, ...moderationLinks, ...settingsLinks]);

	// Highlight the section, also on its sub-pages (e.g. one article inside "Artigos")
	const activeUrl = $derived(
		sections
			.filter((s) => page.url.pathname === s.href || page.url.pathname.startsWith(`${s.href}/`))
			.at(-1)?.href
	);
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window onresize={closeDrawerIfWide} onkeydown={onWindowKeydown} />

{#snippet groupLabel(text: string)}
	<p
		class="px-2 pt-1 pb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
	>
		{text}
	</p>
{/snippet}

<div class="min-h-dvh bg-gray-50 dark:bg-gray-900">
	{#if data.user}
		<!-- Sticky top bar: brand, signed-in user, logout. Nav items live in the sidebar. -->
		<Navbar
			fluid
			class="sticky top-0 z-[60] h-16 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="flex items-center gap-2">
				<button
					type="button"
					class="inline-flex items-center rounded-lg text-sm text-gray-500 hover:bg-gray-100 focus:ring-2 focus:ring-gray-200 focus:outline-hidden md:hidden dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
					onclick={() => (sidebarOpen = !sidebarOpen)}
					aria-expanded={sidebarOpen}
					aria-controls="admin-sidebar"
					aria-label={m.admin_menu()}
				>
					<svg class="m-2 h-6 w-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
						<path
							clip-rule="evenodd"
							fill-rule="evenodd"
							d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
						></path>
					</svg>
				</button>
				<NavBrand href="/admin">
					<img src="/logo-128.webp" alt="" class="me-2 size-8" />
					<span class="text-lg font-semibold whitespace-nowrap dark:text-white">
						{m.admin_title()}
					</span>
				</NavBrand>
			</div>
			<form method="post" action="/admin/logout" class="flex items-center gap-3">
				<span class="hidden text-sm text-gray-600 sm:inline dark:text-gray-300">
					{data.user.name}
					<span class="text-gray-400">·</span>
					{data.user.role === 'admin' ? m.admin_role_admin() : m.admin_role_editor()}
				</span>
				<Button type="submit" size="sm" color="alternative">{m.admin_logout()}</Button>
			</form>
		</Navbar>

		<!--
			Flowbite's Sidebar only mounts after it measures the viewport, so it is
			missing from SSR and from the first paint. disableBreakpoints keeps it in
			the DOM; visibility is CSS (`hidden md:block`, plus `block` when the
			mobile drawer is open).
		-->
		{#if sidebarOpen}
			<button
				type="button"
				class="fixed inset-0 z-40 bg-gray-900/75 md:hidden"
				onclick={closeDrawer}
				aria-label={m.admin_menu_close()}
			></button>
		{/if}

		<Sidebar
			id="admin-sidebar"
			{activeUrl}
			disableBreakpoints
			isOpen
			closeSidebar={closeDrawer}
			ariaLabel={m.admin_menu()}
			class={[
				'admin-sidebar border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
				sidebarOpen ? 'block' : 'hidden',
				'md:block'
			]}
			classes={{ div: 'admin-sidebar-body' }}
		>
			<SidebarWrapper class="flex h-full flex-col">
				<div class="space-y-4">
					<div>
						{@render groupLabel(m.admin_nav_group_content())}
						<SidebarGroup>
							{#each contentLinks as section (section.href)}
								<SidebarItem href={section.href} label={section.label} />
							{/each}
						</SidebarGroup>
					</div>
					<div>
						{@render groupLabel(m.admin_nav_group_moderation())}
						<SidebarGroup>
							{#each moderationLinks as section (section.href)}
								<SidebarItem href={section.href} label={section.label} />
							{/each}
						</SidebarGroup>
					</div>
					{#if settingsLinks.length}
						<div>
							{@render groupLabel(m.admin_nav_group_settings())}
							<SidebarGroup>
								{#each settingsLinks as section (section.href)}
									<SidebarItem href={section.href} label={section.label} />
								{/each}
							</SidebarGroup>
						</div>
					{/if}
				</div>
				<div class="mt-auto">
					<SidebarGroup border>
						<SidebarItem href="/" target="_blank" label="{m.admin_view_site()} ↗" />
					</SidebarGroup>
				</div>
			</SidebarWrapper>
		</Sidebar>

		<div class="md:ms-64">
			{@render children()}
		</div>
	{:else}
		{@render children()}
	{/if}
</div>
