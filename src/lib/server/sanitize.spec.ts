import { describe, expect, it } from 'vitest';
import { toEmbedUrl } from '#lib/embed.ts';
import { fromLisbonInput, toLisbonInput } from '#lib/format.ts';
import { unresolveMediaUrls, resolveMediaUrls } from '#lib/media.ts';
import { sanitizeRichText } from './sanitize.ts';

describe('sanitizeRichText', () => {
	it('keeps editor markup', () => {
		const html =
			'<h2>Título</h2><p><strong>Olá</strong> <a href="https://exemplo.pt">ligação</a></p>' +
			'<figure><img src="/media/a/960.webp" srcset="/media/a/480.webp 480w" alt="x" width="960" height="540" loading="lazy"><figcaption>Legenda</figcaption></figure>';
		expect(sanitizeRichText(html)).toBe(
			html.replace(
				'href="https://exemplo.pt"',
				'href="https://exemplo.pt" rel="noopener noreferrer"'
			)
		);
	});

	it('drops scripts, handlers and unsafe URLs', () => {
		expect(
			sanitizeRichText(
				'<p onclick="x()">a<script>alert(1)</script><a href="javascript:alert(1)">b</a><img src="http://evil/x.png"></p>'
			)
		).toBe('<p>a<a>b</a></p>');
	});

	it('unwraps unknown tags and renames old ones', () => {
		expect(sanitizeRichText('<div><b>a</b><span style="color:red">b</span></div>')).toBe(
			'<strong>a</strong>b'
		);
	});

	it('keeps only allowed video players', () => {
		expect(
			sanitizeRichText(
				'<figure><iframe src="https://www.youtube-nocookie.com/embed/abc123"></iframe></figure><iframe src="https://evil.com/embed/x"></iframe>'
			)
		).toBe(
			'<figure><iframe src="https://www.youtube-nocookie.com/embed/abc123" allowfullscreen=""></iframe></figure>'
		);
	});
});

describe('toEmbedUrl', () => {
	it('reads YouTube links', () => {
		for (const url of [
			'https://www.youtube.com/watch?v=UCldKPdQSwA',
			'https://youtu.be/UCldKPdQSwA',
			'https://youtube.com/shorts/UCldKPdQSwA'
		]) {
			expect(toEmbedUrl(url)).toBe('https://www.youtube-nocookie.com/embed/UCldKPdQSwA');
		}
	});

	it('wraps Facebook videos in the video plugin', () => {
		expect(toEmbedUrl('https://www.facebook.com/carapecos/videos/123')).toBe(
			'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fcarapecos%2Fvideos%2F123'
		);
	});

	it('rejects other links', () => {
		expect(toEmbedUrl('https://vimeo.com/1')).toBeNull();
		expect(toEmbedUrl('não é um link')).toBeNull();
	});
});

describe('Lisbon datetime inputs', () => {
	it('round-trips summer and winter times', () => {
		expect(fromLisbonInput('2026-07-01T10:00')?.toISOString()).toBe('2026-07-01T09:00:00.000Z');
		expect(fromLisbonInput('2026-12-01T10:00')?.toISOString()).toBe('2026-12-01T10:00:00.000Z');
		expect(toLisbonInput(new Date('2026-07-01T09:00:00Z'))).toBe('2026-07-01T10:00');
	});

	it('rejects garbage', () => {
		expect(fromLisbonInput('ontem')).toBeNull();
	});
});

describe('media URLs', () => {
	it('round-trips between stored and editor HTML', () => {
		const stored =
			'<img src="/media/a/960.webp" srcset="/media/a/480.webp 480w, /media/a/960.webp 960w">';
		const base = 'http://localhost:4566/carapecos-media';
		expect(unresolveMediaUrls(resolveMediaUrls(stored, base), base)).toBe(stored);
	});
});

describe('sanitizeRichText trailing content', () => {
	it('drops the empty paragraph the editor keeps at the end', () => {
		expect(sanitizeRichText('<p>Texto</p><p></p><p><br></p>')).toBe('<p>Texto</p>');
		expect(sanitizeRichText('<h2>a</h2><p></p>')).toBe('<h2>a</h2>');
	});
});

describe('sanitizeRichText poll embeds', () => {
	it('keeps poll placeholders and nothing inside them', () => {
		expect(
			sanitizeRichText(
				'<div data-poll="melhor-marcha" onclick="x()"><p>texto</p></div><div data-poll="X Y">a</div>'
			)
		).toBe('<div data-poll="melhor-marcha"></div>a');
	});
});

describe('splitPollEmbeds', () => {
	it('splits the body around polls', async () => {
		const { splitPollEmbeds } = await import('#lib/poll-embeds.ts');
		expect(splitPollEmbeds('<p>a</p><div data-poll="x"></div><p>b</p>')).toEqual([
			{ html: '<p>a</p>' },
			{ poll: 'x' },
			{ html: '<p>b</p>' }
		]);
	});
});
