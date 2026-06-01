'use client';

import { useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Message } from './message';
import type { AppUIMessage } from '@/lib/ai/types';

type Question = { id: string; question: string; placeholder?: string };
type Pending = { toolCallId: string; questions: Question[] };
type LocalState = {
  toolCallId: string;
  index: number;
  answers: { id: string; answer: string }[];
};

export function Chat() {
  const { messages, sendMessage, addToolOutput, status } = useChat<AppUIMessage>({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    experimental_throttle: 50,
  });
  const [input, setInput] = useState('');
  const [local, setLocal] = useState<LocalState | null>(null);

  const busy = status === 'streaming' || status === 'submitted';

  const pending = useMemo<Pending | null>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      for (const part of messages[i].parts) {
        if (
          part.type === 'tool-askUser' &&
          part.state === 'input-available' &&
          Array.isArray(part.input?.questions) &&
          part.input.questions.length > 0
        ) {
          return {
            toolCallId: part.toolCallId,
            questions: part.input.questions as Question[],
          };
        }
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (!pending) {
      if (local) setLocal(null);
      return;
    }
    if (local?.toolCallId !== pending.toolCallId) {
      setLocal({ toolCallId: pending.toolCallId, index: 0, answers: [] });
    }
  }, [pending, local]);

  const currentQuestion =
    pending && local && local.index < pending.questions.length
      ? pending.questions[local.index]
      : null;

  const submit = () => {
    const text = input.trim();
    if (!text || busy) return;

    if (pending && local && currentQuestion) {
      const answers = [...local.answers, { id: currentQuestion.id, answer: text }];
      const nextIndex = local.index + 1;
      if (nextIndex >= pending.questions.length) {
        addToolOutput({
          tool: 'askUser',
          toolCallId: pending.toolCallId,
          output: { answers },
        });
        setLocal(null);
      } else {
        setLocal({ ...local, index: nextIndex, answers });
      }
    } else {
      sendMessage({ text });
    }
    setInput('');
  };

  const progress =
    pending && local
      ? `${Math.min(local.index + 1, pending.questions.length)} of ${pending.questions.length}`
      : null;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4">
      <div className="flex-1 space-y-6 overflow-y-auto py-6">
        {messages.length === 0 && (
          <div className="mt-20 text-center text-muted-foreground">
            <p className="text-lg">
              Try: <em>“I want to create YouTube content in fitness niche”</em>
            </p>
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}
      </div>

      <div className="space-y-2 border-t pb-6 pt-4">
        {currentQuestion && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <div className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">
              Question {progress}
            </div>
            {currentQuestion.question}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              currentQuestion?.placeholder ??
              (currentQuestion
                ? 'Type your answer…'
                : 'What do you want to create today?')
            }
            className="resize-none"
            rows={2}
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            {currentQuestion ? 'Answer' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
}
