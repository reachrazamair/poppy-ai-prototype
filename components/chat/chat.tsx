'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai';
import { ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Message } from './message';
import { UsagePanel } from './usage-panel';
import type { AppUIMessage } from '@/lib/ai/types';

type Question = {
  id: string;
  question: string;
  placeholder?: string;
  options?: string[];
};
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
  const [cardInput, setCardInput] = useState('');
  const [local, setLocal] = useState<LocalState | null>(null);
  const [usageTrigger, setUsageTrigger] = useState(0);
  const prevStatus = useRef(status);

  const busy = status === 'streaming' || status === 'submitted';

  // Trigger usage fetch when the AI finishes a full response
  useEffect(() => {
    if (prevStatus.current !== status && status === 'ready' && messages.length > 0) {
      setUsageTrigger((t) => t + 1);
    }
    prevStatus.current = status;
  }, [status, messages.length]);

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

  const submitAnswer = (answer: string) => {
    if (!pending || !local || !currentQuestion || busy) return;
    const answers = [...local.answers, { id: currentQuestion.id, answer }];
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
    setCardInput('');
    setInput('');
  };

  const goBack = () => {
    if (!local || local.index === 0) return;
    setLocal({ ...local, index: local.index - 1, answers: local.answers.slice(0, -1) });
  };

  const skipAll = () => {
    if (!pending || !local) return;
    const answered = [...local.answers];
    for (let i = local.index; i < pending.questions.length; i++) {
      answered.push({ id: pending.questions[i].id, answer: '' });
    }
    addToolOutput({
      tool: 'askUser',
      toolCallId: pending.toolCallId,
      output: { answers: answered },
    });
    setLocal(null);
    setCardInput('');
    setInput('');
  };

  const submit = () => {
    const text = input.trim();
    if (!text || busy) return;
    if (pending && local && currentQuestion) {
      submitAnswer(text);
    } else {
      sendMessage({ text });
    }
    setInput('');
  };

  const total = pending?.questions.length ?? 0;
  const currentIdx = local?.index ?? 0;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4">
      <div className="flex-1 space-y-6 overflow-y-auto py-6">
        {messages.length === 0 && (
          <div className="mt-20 text-center text-muted-foreground">
            <p className="text-lg">
              Try: <em>"I want to create YouTube content in fitness niche"</em>
            </p>
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}
      </div>

      <div className="space-y-2 border-t pb-6 pt-4">
        <UsagePanel trigger={usageTrigger} />

        {currentQuestion && (
          <div className="overflow-hidden rounded-xl border bg-card shadow-md">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-4 py-3">
              <p className="text-sm font-medium leading-snug">
                {currentQuestion.question}
              </p>
              <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
                <button
                  onClick={goBack}
                  disabled={currentIdx === 0}
                  className="rounded p-1 hover:bg-muted disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-1 text-xs tabular-nums">
                  {currentIdx + 1} of {total}
                </span>
                <button disabled className="rounded p-1 opacity-30">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={skipAll}
                  className="ml-1 rounded p-1 hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Numbered options */}
            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="border-t">
                {currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => submitAnswer(opt)}
                    className="flex w-full items-center gap-3 border-b px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-muted"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    <span className="flex-1">{opt}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {/* Free-text row */}
            <div className="flex items-center gap-2 border-t px-3 py-2">
              <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={
                  currentQuestion.options?.length
                    ? 'Something else…'
                    : (currentQuestion.placeholder ?? 'Type your answer…')
                }
                value={cardInput}
                onChange={(e) => setCardInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (cardInput.trim()) submitAnswer(cardInput.trim());
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => submitAnswer('')}
              >
                Skip
              </Button>
            </div>
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
              currentQuestion ? 'Or reply directly…' : 'What do you want to create today?'
            }
            className="resize-none"
            rows={2}
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
