import type { ChatAddToolOutputFunction, InferUITools, UIMessage } from 'ai';
import type { tools } from '@/lib/ai/tools';

export type AppUIMessage = UIMessage<unknown, never, InferUITools<typeof tools>>;
export type AddToolOutput = ChatAddToolOutputFunction<AppUIMessage>;
