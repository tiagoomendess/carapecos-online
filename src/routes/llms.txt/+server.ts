import { ORIGIN } from '$app/env/private';
import { m } from '#lib/paraglide/messages.js';
import { getCategories, getFooterPages, getLatest } from '#lib/server/content.ts';
import { feedHeaders } from '#lib/server/feeds.ts';
import type { RequestHandler } from './$types';

/** llms.txt (https://llmstxt.org): what the site is and where its content lives, in Markdown */
export const GET: RequestHandler = async () => {
	const site = ORIGIN.replace(/\/$/, '');
	const [categories, pages, latest] = await Promise.all([
		getCategories(),
		getFooterPages(),
		getLatest(20)
	]);

	const body = `# ${m.site_name()}

> ${m.site_description()} Jornal digital local de Carapeços, uma freguesia do concelho de Barcelos (Portugal), em português europeu.

Cada notícia tem uma versão em Markdown: acrescente \`.md\` ao endereço (por exemplo \`${site}/noticias/{slug}.md\`).

## Categorias

${categories.map((c) => `- [${c.name}](${site}/categoria/${c.slug})`).join('\n')}

## Notícias recentes

${latest.map((a) => `- [${a.title}](${site}/noticias/${a.slug}.md): ${a.summary}`).join('\n')}

## Sobre o site

${pages.map((p) => `- [${p.title}](${site}/${p.slug})`).join('\n')}
- [Feed RSS](${site}/rss.xml)
- [Mapa do site](${site}/sitemap.xml)
`;
	return new Response(body, { headers: feedHeaders('text/plain; charset=utf-8') });
};
