import { error, redirect } from '@sveltejs/kit';

/**
 * The `?pagina=N` of a listing URL. Page 1 has no parameter, so `?pagina=1` redirects to the
 * canonical URL; anything that isn't a page number is a 404.
 */
export function pageFromUrl(url: URL) {
	const value = url.searchParams.get('pagina');
	if (value === null) return 1;
	const page = Number(value);
	if (!/^\d+$/.test(value) || page < 1) error(404);
	if (page === 1) {
		const canonical = new URL(url);
		canonical.searchParams.delete('pagina');
		redirect(301, canonical.pathname + canonical.search);
	}
	return page;
}
