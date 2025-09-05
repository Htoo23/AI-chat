import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Local ChatGPT (Next.js + Ollama)',
  description: 'Chat with a local open-source LLM. No OpenAI key needed.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="mx-auto max-w-3xl p-4">
          <header className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Local ChatGPT (No OpenAI)</h1>
            <a className="text-sm opacity-70 hover:opacity-100" href="https://ollama.com" target="_blank" rel="noreferrer">
              Powered by Ollama
            </a>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
