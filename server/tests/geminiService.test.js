import { describe, it, expect, beforeEach, vi } from 'vitest';

const generateContent = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() {
      this.models = { generateContent };
    }
  },
}));

import { env } from '../src/config/env.js';
import { analyzeComplaintText } from '../src/services/geminiService.js';
import { CATEGORIES } from '../src/utils/constants.js';

const input = { title: 'Leaking tap', description: 'The tap in the washroom is leaking.' };
const reply = (obj) => ({ text: JSON.stringify(obj) });
const httpError = (status) => Object.assign(new Error('api error'), { status });

beforeEach(() => {
  generateContent.mockReset();
  env.GEMINI_API_KEY = 'test-key';
  env.GEMINI_TIMEOUT_MS = 100;
});

describe('successful analysis', () => {
  it('returns validated category, priority and summary', async () => {
    generateContent.mockResolvedValueOnce(
      reply({ category: 'Plumbing', priority: 'Medium', summary: 'A tap is leaking.' })
    );
    const result = await analyzeComplaintText(input);
    expect(result).toEqual({ category: 'Plumbing', priority: 'Medium', summary: 'A tap is leaking.' });
  });

  it('asks for structured JSON with the allowed values', async () => {
    generateContent.mockResolvedValueOnce(
      reply({ category: 'Other', priority: 'Low', summary: 'Minor.' })
    );
    await analyzeComplaintText(input);
    const args = generateContent.mock.calls[0][0];
    expect(args.model).toBe(env.GEMINI_MODEL);
    expect(args.config.responseMimeType).toBe('application/json');
    expect(args.config.responseJsonSchema.properties.category.enum).toEqual(CATEGORIES);
    expect(args.contents).toContain('Leaking tap');
  });

  it('truncates an over-long summary instead of failing', async () => {
    generateContent.mockResolvedValueOnce(
      reply({ category: 'Other', priority: 'Low', summary: 'x'.repeat(500) })
    );
    const result = await analyzeComplaintText(input);
    expect(result.summary).toHaveLength(300);
  });
});

describe('bad AI output', () => {
  it('rejects a category that is not allowed', async () => {
    generateContent.mockResolvedValueOnce(
      reply({ category: 'Food', priority: 'Low', summary: 'Hungry.' })
    );
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  });

  it('rejects a missing field', async () => {
    generateContent.mockResolvedValueOnce(reply({ category: 'Other', priority: 'Low' }));
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  });

  it('rejects text that is not JSON', async () => {
    generateContent.mockResolvedValueOnce({ text: 'Sure! Here is my answer.' });
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  });

  it('rejects an empty or missing answer', async () => {
    generateContent.mockResolvedValueOnce({ text: '' });
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'EMPTY_RESPONSE' });
    generateContent.mockResolvedValueOnce({});
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'EMPTY_RESPONSE' });
  });
});

describe('failures from the API', () => {
  it('maps quota and rate limit errors', async () => {
    generateContent.mockRejectedValueOnce(httpError(429));
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'QUOTA' });
  });

  it('maps rejected credentials', async () => {
    generateContent.mockRejectedValueOnce(httpError(403));
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'AUTH' });
  });

  it('maps server errors', async () => {
    generateContent.mockRejectedValueOnce(httpError(503));
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('maps network errors', async () => {
    generateContent.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('times out when the API hangs', async () => {
    generateContent.mockImplementationOnce(() => new Promise(() => {}));
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('fails clearly when there is no API key', async () => {
    env.GEMINI_API_KEY = undefined;
    await expect(analyzeComplaintText(input)).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
    expect(generateContent).not.toHaveBeenCalled();
  });
});