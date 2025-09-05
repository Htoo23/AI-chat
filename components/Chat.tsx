'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Message } from '@/lib/types';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Send, Cog, Globe } from 'lucide-react';

export default function Chat() {
  // Defaults tuned for low-RAM machines
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content:
        'You are a helpful, concise assistant. If unsure, say you are unsure. Use bullet points and short paragraphs.',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(
    () => (typeof window !== 'undefined' && window.localStorage.getItem('model')) || 'qwen2.5:0.5b'
  );
  const [ollamaUrl, setOllamaUrl] = useState(
    () => (typeof window !== 'undefined' && window.localStorage.getItem('ollamaUrl')) || 'http://127.0.0.1:11434'
  );
  const [webAssist, setWebAssist] = useState(
    () => (typeof window !== 'undefined' && window.localStorage.getItem('webAssist') === 'true')
  );
  const [showSettings, setShowSettings] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('model', model);
  }, [model]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('ollamaUrl', ollamaUrl);
  }, [ollamaUrl]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('webAssist', String(webAssist));
  }, [webAssist]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.role !== 'system'),
    [messages]
  );

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    const newMessages = [...messages, { role: 'user', content: question } as Message];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: newMessages,
        model,
        temperature: 0.2,
        webAssist,
        ollamaBase: ollamaUrl,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ Failed to connect to the model. ${text}` },
      ]);
      setLoading(false);
      return;
    }

    // Placeholder assistant message for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let done = false;
    while (!done) {
      const { value, done: doneRead } = await reader.read();
      done = doneRead;
      if (value) {
        const chunk = decoder.decode(value);
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === 'assistant') {
            last.content += chunk;
          }
          return copy;
        });
      }
    }

    setLoading(false);
  }

  function clearChat() {
    setMessages((prev) => [prev[0]]); // keep system prompt
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Header */}
      <div className="rounded-b-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white shadow">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-white/15 p-2 backdrop-blur">
              <Globe className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold">Local ChatGPT (No OpenAI)</h1>
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm backdrop-blur transition hover:bg-white/20"
            title="Settings"
          >
            <div className="flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Settings
            </div>
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mx-auto w-full max-w-3xl p-4">
          <div className="rounded-2xl bg-white/70 p-4 shadow dark:bg-neutral-800/70">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs opacity-70">Model (Ollama)</label>
                <input
                  className="rounded-xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="qwen2.5:0.5b"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs opacity-70">Ollama URL</label>
                <input
                  className="rounded-xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input
                  id="webassist"
                  type="checkbox"
                  checked={webAssist}
                  onChange={(e) => setWebAssist(e.target.checked)}
                  className="h-4 w-4 accent-blue-600"
                />
                <label htmlFor="webassist" className="text-sm">Web Assist (Wikipedia)</label>
                <button
                  onClick={clearChat}
                  className="ml-auto rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  New Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={listRef} className="mx-auto mt-3 flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto p-3">
        {visibleMessages.length === 0 && (
          <div className="mx-auto mt-10 max-w-[60ch] rounded-2xl bg-white/60 p-4 text-center text-sm opacity-80 shadow dark:bg-neutral-800/60">
            Ask me anything. Toggle Web Assist if you want Wikipedia context.
          </div>
        )}
        <ul className="space-y-4">
          {visibleMessages.map((m, i) => (
            <li key={i} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className={clsx(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm shadow ring-1 ring-black/5',
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/80 dark:bg-neutral-800/80 dark:text-neutral-100'
                )}
              >
                {m.content}
              </motion.div>
            </li>
          ))}
          {loading && (
            <li className="text-xs opacity-60">Model is thinking…</li>
          )}
        </ul>
      </div>

      {/* Composer */}
      <form onSubmit={sendMessage} className="sticky bottom-0 w-full">
        <div className="mx-auto max-w-3xl p-3">
          <div className="flex items-end gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5 dark:bg-neutral-800">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Type your question… (Shift+Enter for newline)"
              className="max-h-40 w-full resize-none rounded-xl bg-transparent px-3 py-2 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-500 disabled:opacity-50"
              title="Send"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="mt-2 text-xs opacity-60">
            Tip: Install <b>Ollama</b> and run <code>ollama pull {model}</code>. You can switch to other local models.
          </p>
        </div>
      </form>
    </div>
  );
}
