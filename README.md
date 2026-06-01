# Poppy — content strategist demo

A chat that batches its clarifying questions, runs parallel research tools, and writes a final voice-matched response over the year's top-performing videos in the user's niche. Built for the Poppy AI take-home — ~500 LOC of app code across 14 files (excluding shadcn primitives).

## What it does

1. User: *"I want to create YouTube content in fitness niche"*
2. Claude calls **`askUser`** ONCE with both questions batched in the `questions[]` array. The UI walks them one at a time above the chat input ("Question 1 of 2" → "Question 2 of 2") — no round-trip to the model between answers, so the flow feels instant.
3. Once both answers are collected locally, the UI submits them as a single tool result. Claude then calls **`analyzeSpeakingStyle`** and **`searchContent`** in parallel — Supadata transcript + Claude voice analysis, and YouTube Data API returning the **top 20 videos uploaded this year, ranked by view count**, each enriched with a transcript snippet.
4. Final markdown streams in: one-line speaking-style summary, horizontal video carousel (multi-select, view counts on every card), and 3–4 suggested video titles in the user's voice — weighted toward the highest-view patterns.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- Vercel AI SDK 6 — `streamText` + tool calling + `useChat` with `addToolOutput`
- `@ai-sdk/anthropic` — Claude Sonnet 4.6 default, swap to Opus 4.7 via `MODEL` env
- shadcn/ui + Tailwind v4
- **YouTube Data API v3** — official Google API for search + statistics (view counts, publish dates). Free tier covers ~99 `searchContent` calls/day
- Supadata `/v1/transcript` — clean transcripts

## Setup

```sh
npm install
cp .env.local.example .env.local
# fill in ANTHROPIC_API_KEY, SUPADATA_API_KEY, YOUTUBE_API_KEY
npm run dev
```

> **YouTube key setup**: in [Google Cloud Console](https://console.cloud.google.com/), create a project → enable "YouTube Data API v3" → create an API key. Free tier is 10,000 quota units/day; each `searchContent` call uses ~101 units (1 search.list + 1 videos.list).

Open `http://localhost:3000`.

## Where to look (code review map)

| File | What it does |
|---|---|
| `lib/ai/tools.ts` | All three tool definitions — fits on one screen |
| `lib/ai/system-prompt.ts` | Instructs the model to ask one question at a time before running tools |
| `app/api/chat/route.ts` | The whole server — 16 lines |
| `components/chat/chat.tsx` | Finds the pending `askUser` call and docks its question above the input |
| `components/chat/message.tsx` | Exhaustive switch on `tool-<name>` parts; renders answered Q&A inline |
| `components/chat/video-grid.tsx` | Multi-select cards with thumbnails |

## Key AI SDK 6 patterns used

- **Client-side tool** (`askUser`): no `execute`, only `outputSchema`. Takes an array of `{ id, question, placeholder }` — model sends all questions in one call. The chat finds the pending `tool-askUser` part and walks its `questions[]` locally (tracking `(toolCallId, index, answers[])` in React state); on the final answer it submits all collected answers via `addToolOutput`. Auto-resumes via `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls`. Saves a model round trip per question.
- **Typed messages**: `UIMessage<unknown, never, InferUITools<typeof tools>>` gives the message-parts switch full type-safety (per-tool input + output types).
- **Multi-step loops**: `stopWhen: stepCountIs(5)` lets the model chain onboarding → parallel tools → final text in one stream.
- **`generateObject` inside a tool** for structured speaking-style extraction.
- **Smooth streaming**: server uses `experimental_transform: smoothStream({ chunking: 'word' })` to pace tokens at word boundaries; client uses `experimental_throttle: 50` on `useChat` to batch React renders. Backend smooths the stream rate, frontend keeps render churn low.

## Caching note

`lib/cache.ts` is an in-memory `Map` keyed by YouTube URL. Survives within a single Node process — fine for the demo (Naz explicitly said: *"we don't need to query supadata again and again"*). For prod, swap for Redis or Firestore; the interface is two methods.

## Deploy

```sh
vercel deploy
```

Add `ANTHROPIC_API_KEY` and `SUPADATA_API_KEY` in the Vercel project settings.
