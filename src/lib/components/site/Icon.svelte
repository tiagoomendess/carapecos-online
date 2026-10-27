<script lang="ts" module>
	// Stroke icons on a 24px grid, drawn to match SF Symbols' weight at small sizes
	const paths = {
		back: 'M15 5l-7 7 7 7',
		search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5L20 20',
		sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
		moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
		share: 'M12 3v12M7.5 7.5L12 3l4.5 4.5M6 11H5v9h14v-9h-1',
		link: 'M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2',
		check: 'M5 12.5l4.5 4.5L19 7.5',
		chevronLeft: 'M15 5l-7 7 7 7',
		chevronRight: 'M9 5l7 7-7 7',
		close: 'M6 6l12 12M18 6L6 18',
		menu: 'M4 7h16M4 12h16M4 17h16'
	} as const;

	export type IconName = keyof typeof paths;
</script>

<script lang="ts">
	let { name, size = 22 }: { name: IconName; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={paths[name]} />
</svg>
