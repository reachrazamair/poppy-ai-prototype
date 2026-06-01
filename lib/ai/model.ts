import { anthropic } from '@ai-sdk/anthropic';

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export const modelId = process.env.MODEL ?? DEFAULT_MODEL;
export const model = anthropic(modelId);
