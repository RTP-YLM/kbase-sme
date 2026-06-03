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
  const extraCount = sources.length - 1;

  return (
    <div className="mt-2.5">
      {/* collapsed pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 active:scale-[0.97]"
      >
        {/* document icon */}
        <svg
          className="h-3.5 w-3.5 shrink-0 text-blue-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span>
          {top.section ?? "เอกสาร"}
          {top.page ? ` หน้า ${top.page}` : ""}
        </span>
        {extraCount > 0 && (
          <span className="rounded-full bg-blue-200 px-1.5 py-0 text-[10px] font-bold text-blue-800">
            +{extraCount}
          </span>
        )}
        {/* chevron */}
        <svg
          className={`h-3 w-3 text-blue-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* expanded card */}
      {open && (
        <div className="mt-2 animate-fadein rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            แหล่งอ้างอิง
          </p>
          <ul className="space-y-2">
            {sources.map((s, i) => {
              const pct = Math.round(s.score * 100);
              return (
                <li
                  key={s.source_id + i}
                  className="flex items-start gap-2.5 text-xs"
                >
                  {/* rank badge */}
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[10px] font-bold text-blue-700">
                    {i + 1}
                  </span>

                  {/* source info */}
                  <span className="flex-1 text-gray-700">
                    {s.section ?? "—"}
                    {s.page ? (
                      <span className="ml-1.5 text-gray-400">· หน้า {s.page}</span>
                    ) : null}
                  </span>

                  {/* score bar */}
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-[10px] text-gray-400">{pct}%</span>
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
