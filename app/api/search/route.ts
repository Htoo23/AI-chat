import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  if (!q) return new Response(JSON.stringify({ results: [] }), { headers: { 'Content-Type': 'application/json' } });

  try {
    const search = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=5`,
      { headers: { 'User-Agent': 'local-chatgpt-next/1.0 (no-key)' } }
    ).then((r) => r.json());

    const titles: string[] = (search?.query?.search || []).map((s: any) => s.title);

    const summaries = await Promise.all(
      titles.slice(0, 5).map(async (t) => {
        const s = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`).then((r) => r.json());
        return { title: s.title, url: s.content_urls?.desktop?.page, extract: s.extract };
      })
    );

    return new Response(JSON.stringify({ results: summaries }), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ results: [] }), { headers: { 'Content-Type': 'application/json' } });
  }
}
