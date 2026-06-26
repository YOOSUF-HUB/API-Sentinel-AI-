"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import FileUpload from "@/components/FileUpload";
import { ApiError, uploadDocument } from "@/lib/api";
import type { UploadResponse } from "@/lib/types";

type Status = "idle" | "uploading" | "done" | "error";

export default function UploadPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(file: File) {
    setFileName(file.name);
    setStatus("uploading");
    setError(null);
    setResult(null);

    try {
      const res = await uploadDocument(file);
      setResult(res);
      setStatus("done");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not reach the backend. Is it running on the configured API URL?";
      setError(msg);
      setStatus("error");
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Review your API documentation
        </h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Upload an API specification and Sentinel will ingest it, then run an AI
          agent review that surfaces security, documentation, and best-practice
          issues as a scored report.
        </p>
      </section>

      <FileUpload onSelect={handleSelect} disabled={status === "uploading"} />

      {status === "uploading" && (
        <div className="flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-sm text-slate-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Ingesting <span className="font-medium text-slate-100">{fileName}</span>{" "}
          — parsing, chunking, and embedding…
        </div>
      )}

      {status === "error" && error && (
        <div className="rounded-xl border border-severity-critical/40 bg-severity-critical/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {status === "done" && result && (
        <div className="space-y-4 rounded-xl border border-ink-600 bg-ink-800 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-severity-pass">
            <span>✓</span> Ingested {result.file_name}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Stat label="Chunks" value={String(result.chunk_count)} />
            <Stat
              label="Section types"
              value={result.section_types.join(", ") || "—"}
            />
          </div>

          <button
            onClick={() =>
              router.push(
                `/review?doc_id=${encodeURIComponent(
                  result.doc_id,
                )}&file_name=${encodeURIComponent(result.file_name)}`,
              )
            }
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-accent-muted"
          >
            Start review →
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-700 px-3 py-2.5">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 truncate font-medium text-slate-100">{value}</div>
    </div>
  );
}
