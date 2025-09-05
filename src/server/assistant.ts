import type { Message } from "@prisma/client";

type WireMessage = { role: "system" | "user" | "assistant"; content: string };

function toWire(messages: Message[]): WireMessage[] {
  return messages.map((m) => ({ role: m.role as any, content: m.content }));
}

function localFallback(messages: WireMessage[]): string {
  const last = messages.filter(m => m.role === "user").slice(-1)[0];
  const text = (last?.content || "").trim();

  if (!text) return "I'm here. Ask me anything!";
  const lower = text.toLowerCase();

  if (/[?]$/.test(text)) {
    return "Great question. Here's a concise, step-by-step way to think about it:\n\n1) Clarify the goal\n2) Identify constraints\n3) Propose 2–3 options\n4) Choose and outline next steps.\n\n(Connect an API key to enable real model responses.)";
  }
  if (lower.includes("hello") || lower.includes("hi")) {
    return "Hello! 👋 How can I help you today?";
  }
  if (lower.includes("sql") || lower.includes("sqlite")) {
    return "SQLite tip: use `INTEGER PRIMARY KEY` for an auto-incrementing id, and create indexes on frequently filtered columns for better performance.";
  }
  if (lower.includes("prisma")) {
    return "Prisma tip: prefer `db push` during development for quick schema iteration; use `migrate dev` when you want a migration history.";
  }

  return `You said: “${text}”.\n\nIf you want a deeper answer, add context (goal, constraints, example data). You can also add OPENAI_API_KEY in .env to enable real LLM replies.`;
}

export async function generateAssistantReply(messages: Message[]): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  const wire = toWire(messages);

  if (!key) {
    return localFallback(wire);
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: wire,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("OpenAI error status", res.status, txt);
      return localFallback(wire);
    }
    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.length > 0 ? content : localFallback(wire);
  } catch (e) {
    console.error("OpenAI exception", e);
    return localFallback(wire);
  }
}
