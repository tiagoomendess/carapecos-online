import { ORIGIN } from '$app/env/private';
import { MEDIA_BASE_URL } from '$app/env/public';
import { error, fail } from '@sveltejs/kit';
import { classifyMenuHref } from '#lib/menu.ts';
import { resolveMediaUrls } from '#lib/media.ts';
import { htmlToText, truncate } from '#lib/text.ts';
import { listVisitorMessages, readContactForm, sendContactMessage } from '#lib/server/contact.ts';
import { getPage } from '#lib/server/content.ts';
import type { Actions, PageServerLoad } from './$types';

/** The CMS page that also shows the contact form */
const contactSlug = 'contactos';

// CMS pages (Contactos, Política de privacidade…) live at the root: /{slug}
export const load: PageServerLoad = async (event) => {
	const found = await getPage(event.params.slug);
	if (!found) error(404);
	const isContact = found.slug === contactSlug;
	const siteUrl = ORIGIN.replace(/\/$/, '');
	const links = found.menuItems.flatMap((item) => {
		const classified = classifyMenuHref(item.href, siteUrl);
		if (!item.label || !classified.href) return [];
		return [{ id: item.id, label: item.label, ...classified }];
	});
	return {
		page: {
			title: found.title,
			slug: found.slug,
			body: resolveMediaUrls(found.body, MEDIA_BASE_URL),
			description: truncate(htmlToText(found.body), 160) || found.title
		},
		links,
		contactForm: isContact,
		contactMessages: isContact ? await listVisitorMessages(event.cookies) : []
	};
};

export const actions: Actions = {
	contactar: async (event) => {
		if (event.params.slug !== contactSlug) error(404);
		const input = readContactForm(await event.request.formData());
		const result = await sendContactMessage(event, input);
		if (!result.ok) {
			return fail(400, { contact: { error: result.error } });
		}
		return { contact: { sent: true } };
	}
};
