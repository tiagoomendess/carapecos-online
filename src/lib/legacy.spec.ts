import { describe, expect, it } from 'vitest';
import { categoryForLegacyTags, decodeLegacySegment, parseLegacyDate } from './legacy';
import { slugify } from './slug';

describe('parseLegacyDate', () => {
	it('reads Lisbon winter time (UTC+0)', () => {
		expect(parseLegacyDate('26Out2026 10:34:57')?.toISOString()).toBe('2026-10-26T10:34:57.000Z');
	});

	it('reads Lisbon summer time (UTC+1)', () => {
		expect(parseLegacyDate('22Set2004 08:37:30')?.toISOString()).toBe('2004-09-22T07:37:30.000Z');
	});

	it('rejects unknown formats', () => {
		expect(parseLegacyDate('ontem')).toBeNull();
	});
});

describe('decodeLegacySegment', () => {
	it('decodes ISO-8859-1 and plus signs', () => {
		expect(decodeLegacySegment('Campe%F5es+de+Futebol')).toBe('Campeões de Futebol');
	});

	it('decodes UTF-8 too', () => {
		expect(decodeLegacySegment('Pol%C3%ADtica')).toBe('Política');
	});
});

describe('categoryForLegacyTags', () => {
	it('picks the highest-priority category', () => {
		expect(categoryForLegacyTags(['Igreja', 'Futebol'])).toBe('desporto');
	});

	it('falls back to Sociedade for untagged articles', () => {
		expect(categoryForLegacyTags([])).toBe('sociedade');
	});
});

describe('slugify', () => {
	it('strips accents and punctuation', () => {
		expect(slugify('Carapeços vence S. Fins no 1º Particular!')).toBe(
			'carapecos-vence-s-fins-no-1o-particular'
		);
	});
});
