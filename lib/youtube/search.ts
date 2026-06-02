const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

export type YouTubeVideo = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  url: string;
  views: number;
  publishedAt: string;
};

type SearchResponse = {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails: {
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
    };
  }>;
};

type VideosResponse = {
  items: Array<{
    id: string;
    statistics: { viewCount?: string };
  }>;
};

function yearStartIso() {
  const year = new Date().getUTCFullYear();
  return new Date(Date.UTC(year, 0, 1)).toISOString();
}

export async function searchYouTube(
  query: string,
  count: number,
  duration: 'long' | 'short' | 'any' = 'long',
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY is not set');

  const searchParams = new URLSearchParams({
    key: apiKey,
    q: query,
    type: 'video',
    part: 'snippet',
    order: 'viewCount',
    publishedAfter: yearStartIso(),
    maxResults: String(Math.min(Math.max(count, 1), 50)),
    videoDuration: duration,
  });
  const searchRes = await fetch(`${SEARCH_URL}?${searchParams}`);
  if (!searchRes.ok) {
    throw new Error(`YouTube search ${searchRes.status}: ${await searchRes.text()}`);
  }
  const search = (await searchRes.json()) as SearchResponse;
  if (search.items.length === 0) return [];

  const ids = search.items.map((it) => it.id.videoId);
  const videosParams = new URLSearchParams({
    key: apiKey,
    id: ids.join(','),
    part: 'statistics',
  });
  const videosRes = await fetch(`${VIDEOS_URL}?${videosParams}`);
  if (!videosRes.ok) {
    throw new Error(`YouTube videos ${videosRes.status}: ${await videosRes.text()}`);
  }
  const videos = (await videosRes.json()) as VideosResponse;
  const viewsById = new Map(
    videos.items.map((it) => [it.id, Number(it.statistics.viewCount ?? 0)]),
  );

  return search.items.map((it) => {
    const thumbs = it.snippet.thumbnails;
    return {
      videoId: it.id.videoId,
      title: it.snippet.title,
      channel: it.snippet.channelTitle,
      thumbnail:
        thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? '',
      url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
      views: viewsById.get(it.id.videoId) ?? 0,
      publishedAt: it.snippet.publishedAt,
    };
  });
}
