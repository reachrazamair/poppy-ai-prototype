const SUPADATA_URL = 'https://api.supadata.ai/v1/transcript';

export async function fetchTranscript(youtubeUrl: string): Promise<string> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) throw new Error('SUPADATA_API_KEY is not set');

  const params = new URLSearchParams({
    url: youtubeUrl,
    text: 'true',
    lang: 'en',
  });

  const res = await fetch(`${SUPADATA_URL}?${params}`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!res.ok) {
    throw new Error(`Supadata ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { content: string };
  return data.content;
}
