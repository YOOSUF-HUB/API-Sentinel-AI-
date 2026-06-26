"use client";

import { useCallback, useRef, useState } from "react";

// Accepted extensions, mirroring what the backend parsers handle.
const ACCEPTED = [".json", ".yaml", ".yml", ".txt", ".md", ".pdf"];
const ACCEPT_ATTR = ACCEPTED.join(",");

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function isSupported(name: string): boolean {
  return ACCEPTED.includes(extensionOf(name));
}

export interface FileUploadProps {
  onSelect: (file: File) => void;
  disabled?: boolean;
}

/** Drag-and-drop file picker with extension validation. */
export default function FileUpload({ onSelect, disabled }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!isSupported(file.name)) {
        setError(
          `Unsupported file type "${extensionOf(file.name) || "?"}". ` +
            `Accepted: ${ACCEPTED.join(", ")}.`,
        );
        return;
      }
      setError(null);
      onSelect(file);
    },
    [onSelect],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
          dragging
            ? "border-accent bg-accent/5"
            : "border-ink-500 bg-ink-800 hover:border-ink-500/80 hover:bg-ink-700",
          disabled ? "pointer-events-none opacity-50" : "",
        ].join(" ")}
      >
        <div className="text-3xl">📄</div>
        <div className="text-base font-medium text-slate-100">
          Drag &amp; drop your API spec here
        </div>
        <div className="text-sm text-slate-400">
          or <span className="text-accent">browse</span> to choose a file
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Supports OpenAPI/Swagger (JSON, YAML), plain text, Markdown, and PDF
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-severity-critical">{error}</p>
      )}
    </div>
  );
}
