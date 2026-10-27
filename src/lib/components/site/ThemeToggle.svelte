<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import Icon from './Icon.svelte';

	type Theme = 'light' | 'dark';

	// Unknown until mounted: the server can't know the system setting
	let theme = $state<Theme | null>(null);

	const systemTheme = (): Theme =>
		matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

	onMount(() => {
		const picked = document.documentElement.dataset.theme;
		theme = picked === 'light' || picked === 'dark' ? picked : systemTheme();

		// Keep following the system until the reader picks a theme
		const query = matchMedia('(prefers-color-scheme: dark)');
		const follow = () => {
			if (!document.documentElement.dataset.theme) theme = systemTheme();
		};
		query.addEventListener('change', follow);
		return () => query.removeEventListener('change', follow);
	});

	function toggle() {
		const next: Theme = (theme ?? systemTheme()) === 'dark' ? 'light' : 'dark';
		theme = next;
		document.documentElement.dataset.theme = next;
		try {
			localStorage.setItem('theme', next);
		} catch {
			// Private mode: the choice just isn't remembered
		}
	}
</script>

<button
	type="button"
	class="pressable grid size-11 place-items-center rounded-full"
	onclick={toggle}
	aria-label={theme === 'dark' ? m.theme_to_light() : m.theme_to_dark()}
	title={theme === 'dark' ? m.theme_to_light() : m.theme_to_dark()}
>
	<!-- Both icons are rendered and switched with CSS, so the server render matches the theme -->
	<span class="icon-sun"><Icon name="sun" /></span>
	<span class="icon-moon"><Icon name="moon" size={20} /></span>
</button>

<style>
	.icon-sun {
		display: none;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .icon-sun {
			display: block;
		}

		:global(:root:not([data-theme='light'])) .icon-moon {
			display: none;
		}
	}

	:global(:root[data-theme='dark']) .icon-sun {
		display: block;
	}

	:global(:root[data-theme='dark']) .icon-moon {
		display: none;
	}
</style>
