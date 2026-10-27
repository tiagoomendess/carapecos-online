import { ORIGIN } from '$app/env/private';
import { getCategories, getFooterPages, getNavMenu } from '#lib/server/content.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const siteUrl = ORIGIN.replace(/\/$/, '');
	const [categories, footerPages, menu] = await Promise.all([
		getCategories(),
		getFooterPages(),
		getNavMenu()
	]);
	// Canonical URLs, feeds and social cards use the configured origin, not the request's host
	return { categories, footerPages, menu, siteUrl };
};
