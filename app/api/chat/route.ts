import {
  streamText,
  stepCountIs,
  smoothStream,
  convertToModelMessages,
  type UIMessage,
} from 'ai';
import { model } from '@/lib/ai/model';
import { tools } from '@/lib/ai/tools';
import { systemPrompt } from '@/lib/ai/system-prompt';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    experimental_transform: smoothStream({ chunking: 'word' }),
  });

  return result.toUIMessageStreamResponse();
}
