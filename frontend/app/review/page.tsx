"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import ChatInterface from "@/components/ChatInterface";

function ReviewContent() {
  const params = useSearchParams();
  const docId = params.get("doc_id");
  const fileName = params.get("file_name") ?? "your document";

  if (!docId) {
    return (
      <div className="space-y-4 rounded-xl border border-ink-600 bg-ink-800 p-6 text-center">
        <p className="text-sm text-secondary">
          No document selected. Upload an API specification first.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink-900 transition-colors duration-150 ease-out-quart hover:bg-accent-muted"
        >
          ← Back to upload
        </Link>
      </div>
    );
  }

  return <ChatInterface docId={docId} fileName={fileName} />;
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted">Loading review…</div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}
