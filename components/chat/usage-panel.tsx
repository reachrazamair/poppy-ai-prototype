'use client';

import { useEffect, useState } from 'react';

interface StepUsage {
  step: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  toolCalls: string[];
}

function modelLabel(modelId: string) {
  if (modelId.includes('haiku')) return 'Haiku 4.5';
  if (modelId.includes('sonnet')) return 'Sonnet 4.6';
  return modelId;
}

function fmt(n: number) {
  return n.toLocaleString();
}

export function UsagePanel({ trigger }: { trigger: number }) {
  const [steps, setSteps] = useState<StepUsage[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    fetch('/api/chat')
      .then((r) => r.json())
      .then(setSteps)
      .catch(() => {});
  }, [trigger]);

  if (steps.length === 0) return null;

  const totalTokens = steps.reduce((s, x) => s + x.inputTokens + x.outputTokens, 0);
  const totalCost = steps.reduce((s, x) => s + x.costUsd, 0);

  return (
    <div className="rounded-lg border text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-muted-foreground hover:bg-muted/40 transition-colors"
      >
        <span>
          <span className="font-medium text-foreground">{fmt(totalTokens)} tokens</span>
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span className="font-medium text-foreground">${totalCost.toFixed(5)}</span>
          <span className="mx-1.5 text-muted-foreground/50">·</span>
          <span>{steps.length} steps</span>
        </span>
        <span className="text-muted-foreground/60">{open ? '▲' : '▼'} usage</span>
      </button>

      {open && (
        <div className="border-t divide-y">
          {steps.map((s) => (
            <div key={s.step} className="px-3 py-2 space-y-0.5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/60">step {s.step + 1}</span>
                  <span
                    className={
                      s.model.includes('haiku')
                        ? 'text-blue-500 font-medium'
                        : 'text-purple-500 font-medium'
                    }
                  >
                    {modelLabel(s.model)}
                  </span>
                  {s.toolCalls.length > 0 && (
                    <span className="text-muted-foreground/70">
                      → {s.toolCalls.join(', ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 tabular-nums">
                  <span className="text-muted-foreground">
                    {fmt(s.inputTokens)}↑ {fmt(s.outputTokens)}↓
                  </span>
                  <span className="font-medium">${s.costUsd.toFixed(5)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
