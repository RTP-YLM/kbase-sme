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
  question?: string;   // คำถามที่ถาม (เก็บใน assistant msg เพื่อส่ง feedback)
  sources?: Source[];
  answered?: boolean;
  from_cache?: boolean;
  latency_ms?: number;
}

interface Props {
  message: Message;
  onFeedback?: (sentiment: "correct" | "wrong" | "unclear") => void;
}

export function MessageBubble({ message, onFeedback }: Props) {
  const isUser = message.role === "user";
  const [sent, setSent] = useState<string | null>(null); // sentiment ที่กดแล้ว

  function handleFeedback(value: "correct" | "wrong" | "unclear") {
    if (sent) return; // กดแล้วครั้งนึง — ไม่ให้กดซ้ำ
    setSent(value);
    onFeedback?.(value);
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
        {/* bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-blue-600 text-white"
              : message.answered === false
              ? "rounded-tl-sm bg-amber-50 text-amber-800 ring-1 ring-amber-200"
              : "rounded-tl-sm bg-white text-gray-800 shadow-sm ring-1 ring-gray-200"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* source citations */}
        {!isUser && message.sources && message.answered !== false && (
          <SourceCitation sources={message.sources} />
        )}

        {/* feedback buttons — เฉพาะ assistant ที่ตอบได้ */}
        {!isUser && message.answered && onFeedback && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {sent ? (
              // หลังกด — แสดงสิ่งที่เลือก
              <span className="text-xs text-gray-400">
                {sent === "correct" && "✓ ขอบคุณ — ทำเครื่องหมาย ถูกต้อง"}
                {sent === "wrong" && "✓ ขอบคุณ — ทำเครื่องหมาย ไม่ถูก"}
                {sent === "unclear" && "✓ ขอบคุณ — ทำเครื่องหมาย ไม่ชัดเจน"}
              </span>
            ) : (
              // ก่อนกด — แสดงปุ่มทั้งหมด
              <>
                <span className="text-[11px] text-gray-400">คำตอบนี้:</span>
                {[
                  { label: "✓ ถูกต้อง", value: "correct" as const, cls: "text-green-700 hover:bg-green-50 ring-green-200" },
                  { label: "✗ ไม่ถูก",  value: "wrong"   as const, cls: "text-red-600   hover:bg-red-50   ring-red-200"   },
                  { label: "? ไม่ชัดเจน", value: "unclear" as const, cls: "text-gray-500  hover:bg-gray-100 ring-gray-200" },
                ].map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => handleFeedback(btn.value)}
                    className={`rounded-md px-2 py-0.5 text-xs ring-1 transition-colors ${btn.cls}`}
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
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
            <span>{message.latency_ms} ms</span>
            {message.from_cache && (
              <span className="rounded bg-gray-100 px-1 py-0.5 text-gray-500">cache</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
