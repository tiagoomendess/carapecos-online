import { describe, expect, it } from 'vitest';
import { countLinks, hasBlockedWords } from './moderation.ts';

describe('hasBlockedWords', () => {
	it('matches whole words, ignoring case and accents', () => {
		expect(hasBlockedWords('Que CABRÃO!')).toBe(true);
		expect(hasBlockedWords('foda se, que jogo')).toBe(true);
	});

	it("doesn't flag words that merely contain one", () => {
		expect(hasBlockedWords('O computador da junta avariou')).toBe(false);
		expect(hasBlockedWords('Grande jogo do Carapeços')).toBe(false);
	});
});

describe('countLinks', () => {
	it('counts web addresses', () => {
		expect(countLinks('veja https://a.pt e www.b.pt e c.pt')).toBe(2);
	});
});
