import { describe, expect, it } from 'vitest';
import { correctTypos } from '../src/lib/typo-correction';

describe('correctTypos', () => {
    it('corrects a known single-word typo', () => {
        const result = correctTypos('this is definately true');
        expect(result.hasCorrection).toBe(true);
        expect(result.corrected).toBe('this is definitely true');
        expect(result.corrections).toEqual([{ original: 'definately', corrected: 'definitely' }]);
    });

    it('corrects multiple typos in one string', () => {
        const result = correctTypos('recieve the seperate abandonned items');
        expect(result.hasCorrection).toBe(true);
        expect(result.corrected).toBe('receive the separate abandoned items');
        expect(result.corrections).toHaveLength(3);
    });

    it('returns the input unchanged when there are no typos', () => {
        const result = correctTypos('the quick brown fox jumps over the lazy dog');
        expect(result.hasCorrection).toBe(false);
        expect(result.corrected).toBe('the quick brown fox jumps over the lazy dog');
        expect(result.corrections).toEqual([]);
    });

    it('handles empty input', () => {
        const result = correctTypos('');
        expect(result).toEqual({ corrected: '', hasCorrection: false, corrections: [] });
    });

    it('preserves leading and trailing punctuation around a corrected word', () => {
        const result = correctTypos('(definately), truly.');
        expect(result.corrected).toBe('(definitely), truly.');
    });

    it('preserves the casing of the original word', () => {
        expect(correctTypos('Definately.').corrected).toBe('Definitely.');
        expect(correctTypos('DEFINATELY').corrected).toBe('DEFINITELY');
    });

    it('preserves whitespace exactly, including repeated spaces', () => {
        const result = correctTypos('recieve  the   seperate items');
        expect(result.corrected).toBe('receive  the   separate items');
    });

    it('does not touch URLs', () => {
        const result = correctTypos('see https://recieve.example.com/definately for details');
        expect(result.hasCorrection).toBe(false);
        expect(result.corrected).toBe('see https://recieve.example.com/definately for details');
    });

    it('does not touch domain-like tokens', () => {
        const result = correctTypos('check recieve.com now');
        expect(result.hasCorrection).toBe(false);
        expect(result.corrected).toBe('check recieve.com now');
    });

    it('does not touch words containing digits, such as model identifiers', () => {
        const result = correctTypos('kimi-k2.5 and gpt-4 recieve requests');
        expect(result.corrected).toBe('kimi-k2.5 and gpt-4 receive requests');
        expect(result.corrections).toEqual([{ original: 'recieve', corrected: 'receive' }]);
    });

    it('does not touch code-like tokens', () => {
        const result = correctTypos('run npm_run/recieve.sh and recieve the output');
        expect(result.corrected).toBe('run npm_run/recieve.sh and receive the output');
        expect(result.corrections).toEqual([{ original: 'recieve', corrected: 'receive' }]);
    });

    it('excludes noisy dictionary entries that are not real single-word corrections', () => {
        // "broadcasted" maps to a Wikipedia style note, and "nul"/"treu" map to
        // quoted code keywords ('null'/'true') in the source dataset — neither
        // should be surfaced as an auto-correction.
        expect(correctTypos('broadcasted live').hasCorrection).toBe(false);
        expect(correctTypos('nul pointer').hasCorrection).toBe(false);
        expect(correctTypos('treu story').hasCorrection).toBe(false);
    });
});
