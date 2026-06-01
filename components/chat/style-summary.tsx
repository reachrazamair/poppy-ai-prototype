import { Card } from '@/components/ui/card';
import type { StyleSummary } from '@/lib/ai/tools';

export function StyleSummaryCard({ summary }: { summary: StyleSummary }) {
  return (
    <Card className="p-4 max-w-xl gap-2">
      <div className="text-sm font-medium">Your speaking style</div>
      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Tone</dt>
        <dd>{summary.tone}</dd>
        <dt className="text-muted-foreground">Pacing</dt>
        <dd>{summary.pacing}</dd>
        <dt className="text-muted-foreground">Hook</dt>
        <dd>{summary.hookStyle}</dd>
        {summary.signaturePhrases.length > 0 && (
          <>
            <dt className="text-muted-foreground">Phrases</dt>
            <dd className="text-muted-foreground">
              {summary.signaturePhrases.map((p) => `"${p}"`).join(', ')}
            </dd>
          </>
        )}
      </dl>
    </Card>
  );
}
