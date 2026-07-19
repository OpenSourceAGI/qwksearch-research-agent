import { describe, it, expect } from 'vitest';
import * as QwkSearch from '..';

describe('QwkSearch API Client', () => {

  describe('writeLanguage', () => {
    it('generates language model reply', async () => {
      const result = await QwkSearch..writeLanguage({
        body: {
          agent: 'summarize-bullets',
          article: `
          # What is the capital of France?
          The capital of France is Paris.
          # What is the capital of Germany?
          The capital of Germany is Berlin.
          # What is the capital of Italy?
          The capital of Italy is Rome.
          # What is the capital of Spain?
          `,
          provider: 'groq',
          model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
          html: true,
          temperature: 0.7
        }
      });

      console.log('writeLanguage result:', result.data);
      expect(result.data).toHaveProperty('content'); // Changed from 'reply' to 'content'
    }, 5000); // Added test timeout
  });

  describe('searchWeb', () => {
    it('searches the web', async () => {
      const result = await QwkSearch.searchWeb({
        query: {
          q: 'What is the capital of France?',
          cat: 'general',
          lang: 'en-US',
          page: 1,
          public: false,
          timeout: 10
        }
      });

      console.log('searchWeb result:', result.data);
      expect(result.data).toHaveProperty('results'); // Changed from 'results' to 'items'

      if (result.data.results.length > 0) {
        const firstResult = result.data.results[0];
        expect(firstResult).toHaveProperty('title');
        expect(firstResult).toHaveProperty('url'); 
      }
    }, 10000); // Added test timeout
  });



  describe('extractContent', () => {
    it('extracts content from a URL', async () => {
      const result = await QwkSearch.extractContent({
        query: {
          url: 'https://builtin.com/data-science/beginners-guide-language-models',
          timeout: 10 
        }
      });

      console.log('extractContent result:', result.data);
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('html');
      expect(result.data.title).toBe('A Beginner\'s Guide to Language Models');
    }, 10000); // Added longer test timeout
  });

});
