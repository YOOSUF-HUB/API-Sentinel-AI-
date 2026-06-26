// Thin client over the FastAPI backend. All network access lives here so the
// components stay declarative.
import type {
  DeleteResponse,
  ReviewEvent,
  ReviewMode,
  UploadResponse,
} from "@/lib/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

/** Friendly error carrying the HTTP status for the UI to branch on. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function detailOf(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.detail === "string") return body.detail;
  } catch {
    /* response had no JSON body */
  }
  return `Request failed with status ${res.status}`;
}

/** Upload + ingest an API document. */
export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new ApiError(await detailOf(res), res.status);
  return (await res.json()) as UploadResponse;
}

/** Delete all chunks for a document. */
export async function deleteDocument(docId: string): Promise<DeleteResponse> {
  const res = await fetch(`${API_URL}/document/${docId}`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(await detailOf(res), res.status);
  return (await res.json()) as DeleteResponse;
}

/**
 * Run a streaming review. Yields each NDJSON event as it arrives so the UI can
 * show live progress and then the final report.
 */
export async function* streamReview(
  docId: string,
  question: string,
  mode: ReviewMode,
): AsyncGenerator<ReviewEvent> {
  const res = await fetch(`${API_URL}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc_id: docId, question, mode }),
  });
  if (!res.ok) throw new ApiError(await detailOf(res), res.status);
  if (!res.body) throw new ApiError("Streaming is not supported here.", 500);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // NDJSON: one JSON object per line.
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line) as ReviewEvent;
    }
  }

  const tail = buffer.trim();
  if (tail) yield JSON.parse(tail) as ReviewEvent;
}
