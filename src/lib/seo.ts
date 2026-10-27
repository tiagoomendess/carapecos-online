import { MEDIA_BASE_URL } from '$app/env/public';
import { pickVariant, variantKey } from '#lib/media.ts';
import { m } from '#lib/paraglide/messages.js';
import { mediaUrl } from '#lib/storage.ts';
import type { Image } from '#lib/types.ts';

/** Structured data (schema.org JSON-LD) and social images for the public pages */

/** The largest stored size of an image (up to 1600px), for social cards and JSON-LD */
export function shareImage(image: Image) {
	const width = pickVariant(image.variants, 1600);
	return {
		url: mediaUrl(MEDIA_BASE_URL, variantKey(image.key, width)),
		width,
		height: Math.round((image.height * width) / image.width)
	};
}

export const organization = (siteUrl: string) => ({
	'@type': 'NewsMediaOrganization',
	'@id': `${siteUrl}/#organization`,
	name: m.site_name(),
	url: `${siteUrl}/`,
	foundingDate: '2004',
	logo: { '@type': 'ImageObject', url: `${siteUrl}/icon-512.png`, width: 512, height: 512 }
});

export const website = (siteUrl: string) => ({
	'@context': 'https://schema.org',
	'@graph': [
		organization(siteUrl),
		{
			'@type': 'WebSite',
			'@id': `${siteUrl}/#website`,
			url: `${siteUrl}/`,
			name: m.site_name(),
			description: m.site_description(),
			inLanguage: 'pt-PT',
			publisher: { '@id': `${siteUrl}/#organization` },
			potentialAction: {
				'@type': 'SearchAction',
				target: `${siteUrl}/pesquisa?q={search_term_string}`,
				'query-input': 'required name=search_term_string'
			}
		}
	]
});

export function newsArticle(
	siteUrl: string,
	article: {
		slug: string;
		title: string;
		summary: string;
		publishedAt: Date;
		updatedAt: Date;
		cover: Image | null;
		category: { name: string };
	}
) {
	const url = `${siteUrl}/noticias/${article.slug}`;
	return {
		'@context': 'https://schema.org',
		'@type': 'NewsArticle',
		'@id': url,
		mainEntityOfPage: url,
		url,
		headline: article.title.slice(0, 110),
		description: article.summary,
		image: article.cover ? [shareImage(article.cover).url] : [`${siteUrl}/og-default.png`],
		datePublished: article.publishedAt.toISOString(),
		dateModified: (article.updatedAt > article.publishedAt
			? article.updatedAt
			: article.publishedAt
		).toISOString(),
		articleSection: article.category.name,
		inLanguage: 'pt-PT',
		// No bylines on this site (see DRAFT.md): the organization is the author
		author: { '@id': `${siteUrl}/#organization` },
		publisher: organization(siteUrl)
	};
}

export const breadcrumbs = (siteUrl: string, items: { name: string; path: string }[]) => ({
	'@context': 'https://schema.org',
	'@type': 'BreadcrumbList',
	itemListElement: items.map((item, i) => ({
		'@type': 'ListItem',
		position: i + 1,
		name: item.name,
		item: `${siteUrl}${item.path}`
	}))
});
