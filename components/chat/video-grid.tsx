'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { ContentMatch } from '@/lib/ai/tools';

function formatViews(n: number) {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
  }
  return `${n} views`;
}

export function VideoGrid({ videos }: { videos: ContentMatch[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="-mx-4">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3">
        {videos.map((v) => {
          const isSelected = selected.has(v.videoId);
          return (
            <Card
              key={v.videoId}
              onClick={() => toggle(v.videoId)}
              className={`w-64 shrink-0 snap-start cursor-pointer gap-2 p-3 transition ${
                isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              }`}
            >
              {v.thumbnail && (
                <div className="relative aspect-video overflow-hidden rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.thumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white">
                    {formatViews(v.views)}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {v.title}
                  </a>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {v.channel}
                  </p>
                </div>
                <Checkbox
                  checked={isSelected}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => toggle(v.videoId)}
                  className="shrink-0"
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
