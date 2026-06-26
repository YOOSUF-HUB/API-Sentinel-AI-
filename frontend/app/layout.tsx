import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Sentinel AI",
  description:
    "RAG-powered API documentation reviewer — surfaces security, documentation, and best-practice issues as a scored report.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-ink-600 bg-ink-800/70 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-lg">
                  🛡️
                </span>
                <span className="text-lg font-semibold tracking-tight text-slate-100">
                  API Sentinel{" "}
                  <span className="text-accent">AI</span>
                </span>
              </Link>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
            {children}
          </main>

          <footer className="border-t border-ink-600 px-6 py-5 text-center text-xs text-slate-500">
            RAG-powered API documentation reviewer
          </footer>
        </div>
      </body>
    </html>
  );
}
