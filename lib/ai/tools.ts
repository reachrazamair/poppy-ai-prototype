import { tool, generateObject } from 'ai';
import { z } from 'zod';
import { model } from '@/lib/ai/model';
import { searchYouTube, type YouTubeVideo } from '@/lib/youtube/search';
import { fetchTranscript } from '@/lib/youtube/transcript';
import { createCache } from '@/lib/cache';

const styleSchema = z.object({
  tone: z.string().describe('e.g. "casual and energetic"'),
  pacing: z.string().describe('e.g. "fast, punchy sentences"'),
  signaturePhrases: z.array(z.string()).max(5),
  hookStyle: z.string().describe('How they open their videos'),
});

export type StyleSummary = z.infer<typeof styleSchema>;

export type ContentMatch = YouTubeVideo & { transcriptSnippet: string };

const styleCache = createCache<StyleSummary>();

export const tools = {
  askUser: tool({
    description:
      "Ask the user a sequence of clarifying questions in one batched call. The UI shows the questions one at a time above the chat input; the user answers each in turn, and the tool result returns once all answers are collected. Pass EVERY question you need upfront so the user doesn't have to wait for the model between questions. Use stable, snake_case ids so you can reference each answer later (e.g. `youtube_url`, `business`).",
    inputSchema: z.object({
      questions: z
        .array(
          z.object({
            id: z
              .string()
              .describe('Stable identifier for this question, e.g. "youtube_url"'),
            question: z.string().describe('The question text shown to the user'),
            placeholder: z
              .string()
              .optional()
              .describe('Optional hint shown inside the answer field'),
          }),
        )
        .min(1),
    }),
    outputSchema: z.object({
      answers: z.array(
        z.object({
          id: z.string(),
          answer: z.string(),
        }),
      ),
    }),
  }),

  analyzeSpeakingStyle: tool({
    description:
      "Analyze a YouTube video of the user speaking to extract their voice: tone, pacing, signature phrases, and how they open videos. Pass the YouTube URL the user provided.",
    inputSchema: z.object({
      youtubeUrl: z.string().url(),
    }),
    execute: async ({ youtubeUrl }): Promise<StyleSummary> => {
      const cached = styleCache.get(youtubeUrl);
      if (cached) return cached;

      const transcript = await fetchTranscript(youtubeUrl);
      const { object } = await generateObject({
        model,
        schema: styleSchema,
        prompt: `Analyze the speaking style of the person in this transcript. Be concrete and brief.\n\nTranscript:\n${transcript.slice(0, 6000)}`,
      });
      styleCache.set(youtubeUrl, object);
      return object;
    },
  }),

  searchContent: tool({
    description:
      'Search YouTube for the top videos in the niche the user wants to create content for. Returns videos uploaded this calendar year, sorted by view count (most-viewed first), enriched with view counts, publish dates, channels, thumbnails, and transcript snippets the model can use as inspiration.',
    inputSchema: z.object({
      query: z
        .string()
        .describe('Search query, e.g. "how to lose belly fat fitness tips"'),
      count: z.number().int().min(1).max(20).default(20),
    }),
    execute: async ({ query, count }): Promise<ContentMatch[]> => {
      const videos = await searchYouTube(query, count);
      return Promise.all(
        videos.map(async (v) => {
          try {
            const t = await fetchTranscript(v.url);
            return { ...v, transcriptSnippet: t.slice(0, 500) };
          } catch {
            return { ...v, transcriptSnippet: '' };
          }
        }),
      );
    },
  }),
};
