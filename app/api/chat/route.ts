import {
  streamText,
  stepCountIs,
  smoothStream,
  convertToModelMessages,
  type UIMessage,
} from 'ai';
import { model, haikuModel, modelId, haikuId } from '@/lib/ai/model';
import { tools } from '@/lib/ai/tools';
import { systemMessage } from '@/lib/ai/system-prompt';
import { usageStore, type StepUsage } from '@/lib/ai/usage-store';

export const maxDuration = 60;

// Approximate Anthropic pricing per million tokens (USD)
const PRICING: Record<string, { input: number; output: number }> = {
  [modelId]: { input: 3.0, output: 15.0 },
  [haikuId]: { input: 0.8, output: 4.0 },
};

function calcCost(usedModelId: string, input: number, output: number): number {
  const p = PRICING[usedModelId] ?? PRICING[modelId];
  return (input * p.input + output * p.output) / 1_000_000;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const stepUsages: StepUsage[] = [];

  const result = streamText({
    model,
    system: systemMessage,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
    experimental_transform: smoothStream({ chunking: 'word' }),

    // Tiered models + context windowing applied per step
    prepareStep: ({ steps, messages: stepMsgs }) => {
      // Only switch to Sonnet once we have searchContent results (final response step)
      const hasContentResults = steps.some((s) =>
        s.toolResults.some((r) => r.toolName === 'searchContent'),
      );
      const stepModel = hasContentResults ? model : haikuModel;

      // Context window: for early steps (no content results yet), prune old messages
      // to avoid re-sending growing history through cheap routing steps.
      const windowedMessages =
        !hasContentResults && stepMsgs.length > 4
          ? stepMsgs.slice(-4)
          : stepMsgs;

      return { model: stepModel, messages: windowedMessages };
    },

    onStepFinish({ stepNumber, model: usedModel, usage, toolCalls }) {
      const usedModelId = usedModel?.modelId ?? modelId;
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;
      stepUsages.push({
        step: stepNumber,
        model: usedModelId,
        inputTokens,
        outputTokens,
        costUsd: calcCost(usedModelId, inputTokens, outputTokens),
        toolCalls: toolCalls.map((tc) => tc.toolName),
      });
    },

    onFinish() {
      usageStore.set(stepUsages);
    },
  });

  return result.toUIMessageStreamResponse();
}

export async function GET() {
  return Response.json(usageStore.get());
}
