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
      {/* inline citation — differentiator ตาม MOM bizdev */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
      >
        <span>📄</span>
        <span>
          อ้างอิง: {top.section ?? "เอกสาร"}
          {top.page ? ` หน้า ${top.page}` : ""}
        </span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <ul className="mt-1.5 space-y-1 rounded-lg border border-blue-100 bg-blue-50 p-2">
          {sources.map((s, i) => (
            <li key={s.source_id + i} className="text-xs text-blue-800">
              <span className="font-medium">[{i + 1}]</span>{" "}
              {s.section ?? "—"}
              {s.page ? ` · หน้า ${s.page}` : ""}
              <span className="ml-2 text-blue-400">
                score {(s.score * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
