import { anthropic } from '@ai-sdk/anthropic';

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export const modelId = process.env.MODEL ?? DEFAULT_MODEL;
export const haikuId = 'claude-haiku-4-5-20251001';

export const model = anthropic(modelId);
export const haikuModel = anthropic(haikuId);
