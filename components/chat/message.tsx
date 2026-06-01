'use client';

import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';
import type { AppUIMessage } from '@/lib/ai/types';
import { StyleSummaryCard } from './style-summary';
import { VideoGrid } from './video-grid';

type Props = { message: AppUIMessage };

export function Message({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={isUser ? 'flex justify-end' : ''}>
      <div
        className={
          isUser
            ? 'max-w-[80%] rounded-2xl bg-muted px-4 py-2 text-sm'
            : 'max-w-[90%] space-y-3'
        }
      >
        {message.parts.map((part, i) => {
          switch (part.type) {
            case 'text':
              return (
                <div
                  key={i}
                  className="text-sm leading-relaxed [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
                >
                  <ReactMarkdown>{part.text}</ReactMarkdown>
                </div>
              );

            case 'tool-askUser': {
              // Pending state is rendered as the docked question above the input, not inline.
              if (part.state !== 'output-available') return null;
              const answers = new Map(
                part.output.answers.map((a) => [a.id, a.answer]),
              );
              return (
                <div key={i} className="space-y-3">
                  {part.input.questions.map((q) => (
                    <div key={q.id} className="space-y-1.5">
                      <p className="text-sm">{q.question}</p>
                      <p className="border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground">
                        {answers.get(q.id) ?? ''}
                      </p>
                    </div>
                  ))}
                </div>
              );
            }

            case 'tool-analyzeSpeakingStyle':
              if (part.state === 'output-available') {
                return <StyleSummaryCard key={i} summary={part.output} />;
              }
              return (
                <PendingCard key={i}>Analyzing speaking style…</PendingCard>
              );

            case 'tool-searchContent':
              if (part.state === 'output-available') {
                return <VideoGrid key={i} videos={part.output} />;
              }
              return (
                <PendingCard key={i}>Searching for content to model…</PendingCard>
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}

function PendingCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="flex max-w-xl flex-row items-center gap-2 p-3 text-sm text-muted-foreground">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
      {children}
    </Card>
  );
}
