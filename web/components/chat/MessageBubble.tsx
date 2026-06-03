"use client";

import { useState } from "react";
import { SourceCitation } from "./SourceCitation";

interface Source {
  source_id: string;
  section: string | null;
  page: number | null;
  score: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  question?: string; // คำถามที่ถาม (เก็บใน assistant msg เพื่อส่ง feedback)
  sources?: Source[];
  answered?: boolean;
  from_cache?: boolean;
  latency_ms?: number;
}

interface Props {
  message: Message;
  onFeedback?: (sentiment: "correct" | "wrong" | "unclear") => void;
}

const FEEDBACK_BUTTONS = [
  {
    label: "✓ ถูกต้อง",
    value: "correct" as const,
    cls: "text-green-700 hover:bg-green-50 ring-green-200 hover:ring-green-300",
  },
  {
    label: "✗ ไม่ถูก",
    value: "wrong" as const,
    cls: "text-red-600 hover:bg-red-50 ring-red-200 hover:ring-red-300",
  },
  {
    label: "? ไม่ชัด",
    value: "unclear" as const,
    cls: "text-gray-500 hover:bg-gray-100 ring-gray-200 hover:ring-gray-300",
  },
] as const;

export function MessageBubble({ message, onFeedback }: Props) {
  const isUser = message.role === "user";
  const isError = message.answered === false;
  const [sent, setSent] = useState<string | null>(null);

  function handleFeedback(value: "correct" | "wrong" | "unclear") {
    if (sent) return;
    setSent(value);
    onFeedback?.(value);
  }

  return (
    <div
      className={`flex animate-fadein items-end gap-2.5 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* AI avatar — เฉพาะ assistant */}
      {!isUser && (
        <span className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm">
          K
        </span>
      )}

      <div className={`max-w-[78%] ${isUser ? "" : ""}`}>
        {/* bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-br-sm bg-blue-600 text-white shadow-sm shadow-blue-200"
              : isError
              ? "rounded-bl-sm bg-amber-50 text-amber-800 ring-1 ring-amber-200"
              : "rounded-bl-sm bg-white text-gray-800 shadow-sm ring-1 ring-gray-200"
          }`}
        >
          {/* error icon row */}
          {isError && !isUser && (
            <div className="mb-2 flex items-center gap-1.5 text-amber-600">
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-xs font-semibold">ไม่พบข้อมูล</span>
            </div>
          )}
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* source citations */}
        {!isUser && message.sources && !isError && (
          <SourceCitation sources={message.sources} />
        )}

        {/* feedback buttons — เฉพาะ assistant ที่ตอบได้ */}
        {!isUser && message.answered && onFeedback && (
          <div className="mt-2 flex items-center gap-1.5">
            {sent ? (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <svg
                  className="h-3.5 w-3.5 text-green-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                ขอบคุณสำหรับ feedback
              </span>
            ) : (
              <>
                <span className="text-[11px] text-gray-400">คำตอบนี้:</span>
                {FEEDBACK_BUTTONS.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => handleFeedback(btn.value)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 transition-all active:scale-95 ${btn.cls}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* meta — latency + cache badge */}
        {!isUser && message.latency_ms !== undefined && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-400">
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{message.latency_ms} ms</span>
            {message.from_cache && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500">
                cache
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
