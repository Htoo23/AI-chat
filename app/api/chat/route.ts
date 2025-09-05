import { NextRequest } from 'next/server';
import type { ChatRequest, Message } from '@/lib/types';

export const runtime = 'nodejs';

const BASE_SYSTEM = `
You are a helpful assistant. Be concise, factual, and avoid fabrications. If the answer is unknown, say so and suggest how to verify. Prefer bullet points; show short code when asked.
`;

async function wikipediaContext(q: string) {
  if (!q) return '';
  try {
    const search = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=3`,
      { headers: { 'User-Agent': 'local-chatgpt-next/1.0 (no-key)' } }
    ).then((r) => r.json());

    const pageIds: number[] = (search?.query?.search || []).map((s: any) => s.pageid);
    if (!pageIds.length) return '';

    const details = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|info&inprop=url&exintro=1&explaintext=1&pageids=${pageIds.join(',')}&format=json`,
      { headers: { 'User-Agent': 'local-chatgpt-next/1.0 (no-key)' } }
    ).then((r) => r.json());

    const pages = details?.query?.pages || {};
    let out = '';
    for (const id of Object.keys(pages)) {
      const p = pages[id];
      if (!p) continue;
      out += `\n- [${p.title}](${p.fullurl}): ${String(p.extract || '').slice(0, 800)}\n`;
    }
    return out.trim();
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatRequest;
  const model = body.model || process.env.OLLAMA_MODEL || 'llama3.1:8b';
  const temperature = body.temperature ?? 0.2;
  const base = (body as any).ollamaBase || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

  const msgs: Message[] = [];
  msgs.push({ role: 'system', content: BASE_SYSTEM });

  if (body.webAssist) {
    const lastUser = [...body.messages].reverse().find((m) => m.role === 'user');
    const ctx = await wikipediaContext(lastUser?.content || '');
    if (ctx) {
      msgs.push({
        role: 'system',
        content: `Additional web context (Wikipedia snippets; may be incomplete):\n${ctx}\nUse this context only if relevant, and cite titles in [brackets].`,
      });
    }
  }

  for (const m of body.messages) {
    if (m.role === 'system') continue;
    msgs.push(m);
  }

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, stream: true, messages: msgs, options: { temperature } }),
    });
  } catch (e: any) {
    const msg = `Cannot reach Ollama at ${base}. ${e?.message || e}`;
    return new Response(msg, { status: 502 });
  }

  if (!ollamaRes.ok || !ollamaRes.body) {
    const text = await ollamaRes.text().catch(() => '');
    const msg = `Failed to reach Ollama server at ${base}. Status: ${ollamaRes.status}. ${text}`;
    return new Response(msg, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let buffer = '';
      const reader = ollamaRes.body!.getReader();

      const pump = () => reader.read().then(({ value, done }) => {
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const json = JSON.parse(trimmed);
            const piece = json?.message?.content as string | undefined;
            if (piece) controller.enqueue(encoder.encode(piece));
          } catch {}
        }
        pump();
      });

      pump();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
