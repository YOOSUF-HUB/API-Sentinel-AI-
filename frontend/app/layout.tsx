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
          {/* Opaque Surface, no blur. This header is static — nothing ever
              scrolls under it — so `bg-ink-800/70 backdrop-blur` was blurring a
              flat, uniform backdrop into the identical flat colour: a real
              compositing layer bought for zero pixels of effect, and
              glassmorphism by accident rather than intent. Depth here is the ink
              ramp plus a hairline, like every other surface in the system. */}
          <header className="border-b border-ink-600 bg-ink-800">
            <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-lg">
                  🛡️
                </span>
                <span className="text-lg font-semibold tracking-tight text-bright">
                  API Sentinel{" "}
                  <span className="text-accent">AI</span>
                </span>
              </Link>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
            {children}
          </main>

          <footer className="border-t border-ink-600 px-6 py-5 text-center text-xs text-muted">
            RAG-powered API documentation reviewer
          </footer>
        </div>
      </body>
    </html>
  );
}
