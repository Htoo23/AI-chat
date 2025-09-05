import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatGPT ",
  description: "Minimal chat app ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container py-6">
          <header className="mb-6">
            <h1 className="text-2xl font-bold">ChatGPT‑style App</h1>
            <p className="text-sm text-neutral-400">Next.js + Prisma (SQLite){' '}
              <span className="italic">with optional OpenAI</span>
            </p>
          </header>
          {children}
          <footer className="mt-10 text-xs text-neutral-500">
            Built for local use. Add your OpenAI key in <code>.env</code> to enable real LLM responses.
          </footer>
        </div>
      </body>
    </html>
  );
}
