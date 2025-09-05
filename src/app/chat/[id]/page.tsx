"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type Message = { id: string; role: "system" | "user" | "assistant"; content: string; createdAt: string };

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`/api/chat/${id}/messages`, { cache: "no-store" });
      if (res.ok) {
        setMessages(await res.json());
      } else {
        const txt = await res.text().catch(() => "");
        alert(`Failed to load messages (${res.status})\n${txt}`);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setSending(true);

    const tempUser: Message = { id: "temp-user-" + Date.now(), role: "user", content: text, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUser]);
    setInput("");

    const res = await fetch(`/api/chat/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text })
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
      if (res.status === 404) {
        alert(`This chat no longer exists. Create a new chat.\n(${res.status}) ${body}`);
        router.push("/");
      } else {
        alert(`Failed to send message (${res.status})\n${body}`);
      }
    } else {
      const newMsgs: Message[] = await res.json();
      setMessages(newMsgs);
    }
    setSending(false);
  }

  return (
    <main>
      <div className="mb-4 flex items-center gap-2">
        <button
          className="rounded-lg border border-neutral-800 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-900"
          onClick={() => router.push("/")}
        >
          ← Back
        </button>
        <h2 className="text-xl font-semibold">Chat</h2>
      </div>

      <div
        ref={listRef}
        className="h-[60vh] w-full overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950 p-4"
      >
        {loading && <div className="text-neutral-400">Loading messages…</div>}
        {!loading && messages.length === 0 && (
          <div className="text-neutral-400">Say hello to start the conversation.</div>
        )}
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="flex">
              <div
                className={
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                  (m.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : m.role === "assistant"
                    ? "bg-neutral-900 text-neutral-100"
                    : "bg-neutral-800 text-neutral-200")
                }
                title={new Date(m.createdAt).toLocaleString()}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something…"
          className="min-h-[44px] flex-1 resize-y rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-blue-600"
          rows={2}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </main>
  );
}
