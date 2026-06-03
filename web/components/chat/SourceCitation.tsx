"use client";

import { useState } from "react";

interface Source {
  source_id: string;
  section: string | null;
  page: number | null;
  score: number;
}

interface Props {
  sources: Source[];
}

export function SourceCitation({ sources }: Props) {
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  const top = sources[0];

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
      >
        <span className="text-blue-500">📄</span>
        <span>อ้างอิง: {top.section ?? "เอกสาร"}{top.page ? ` หน้า ${top.page}` : ""}</span>
        <span className="text-blue-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">แหล่งอ้างอิง</p>
          <ul className="space-y-1.5">
            {sources.map((s, i) => (
              <li key={s.source_id + i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700">
                  {i + 1}
                </span>
                <span className="text-gray-700">
                  {s.section ?? "—"}
                  {s.page ? <span className="text-gray-400"> · หน้า {s.page}</span> : null}
                </span>
                <span className="ml-auto shrink-0 text-[10px] text-gray-400">
                  {(s.score * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
