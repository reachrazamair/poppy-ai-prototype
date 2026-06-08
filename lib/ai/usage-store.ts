export interface StepUsage {
  step: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  toolCalls: string[];
}

// In-memory store — fine for a single-process dev server. Production would use Redis.
const state: { data: StepUsage[] } = { data: [] };

export const usageStore = {
  set: (data: StepUsage[]) => {
    state.data = data;
  },
  get: (): StepUsage[] => state.data,
};
