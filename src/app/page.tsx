"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ChatMeta = { id: string; title: string; updatedAt: string };

export default function HomePage() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (res.ok) setChats(await res.json());
      setLoading(false);
    })();
  }, []);

  async function createChat() {
    setCreating(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat" })
    });
    const data = await res.json();
    setCreating(false);
    router.push(`/chat/${data.id}`);
  }

  return (
    <main>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Chats</h2>
        <button
          onClick={createChat}
          disabled={creating}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {creating ? "Creating..." : "New Chat"}
        </button>
      </div>

      <div className="mt-4 divide-y divide-neutral-800 rounded-lg border border-neutral-800">
        {loading && <div className="p-4 text-neutral-400">Loading...</div>}
        {!loading && chats.length === 0 && (
          <div className="p-4 text-neutral-400">No chats yet. Create one!</div>
        )}
        {chats.map((c) => (
          <button
            key={c.id}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-neutral-900"
            onClick={() => router.push(`/chat/${c.id}`)}
          >
            <div>
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-neutral-500">
                Updated {new Date(c.updatedAt).toLocaleString()}
              </div>
            </div>
            <div className="text-neutral-500">→</div>
          </button>
        ))}
      </div>
    </main>
  );
}
