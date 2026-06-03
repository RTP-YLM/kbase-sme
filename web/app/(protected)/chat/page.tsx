"use client";

import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MessageBubble, type Message } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { useAuth } from "@/store/auth";

const DEPT_LABELS: Record<string, string> = {
  hr: "HR",
  accounting: "บัญชี",
  finance: "การเงิน",
  sales: "ขาย",
  operations: "ปฏิบัติการ",
  legal: "กฎหมาย",
  general: "ทั่วไป",
};

export default function ChatPage() {
  const { departments } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDept, setActiveDept] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ตั้ง dept เริ่มต้น: null = ค้นทุก dept (ไม่ filter)
  useEffect(() => {
    setActiveDept(null);
  }, [departments]);

  // scroll to bottom เมื่อมี message ใหม่
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(question: string) {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/proxy/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          department: activeDept ?? undefined,
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answered
          ? data.answer
          : "ขออภัย ไม่พบข้อมูลที่เกี่ยวข้องในเอกสารที่มีอยู่ กรุณาติดต่อผู้รับผิดชอบโดยตรง",
        question,
        sources: data.sources ?? [],
        answered: data.answered,
        from_cache: data.from_cache,
        latency_ms: data.latency_ms,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
          answered: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFeedback(
    msg: Message,
    sentiment: "correct" | "wrong" | "unclear"
  ) {
    await fetch("/api/proxy/api/query/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: msg.question ?? msg.content,
        feedback: sentiment,
      }),
    }).catch(() => {});
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Navbar />

      {/* department selector — แสดงเฉพาะถ้ามี dept > 1 */}
      {departments.length > 1 && (
        <div className="border-b border-gray-200 bg-white px-4 py-2.5">
          <div className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto pb-0.5">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">
              ค้นใน
            </span>
            <div className="mx-1 h-4 w-px bg-gray-200" />
            <button
              onClick={() => setActiveDept(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                activeDept === null
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ทุกแผนก
            </button>
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDept(d === activeDept ? null : d)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  activeDept === d
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {DEPT_LABELS[d] ?? d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* message thread */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
          {messages.length === 0 && <EmptyState onSend={handleSend} />}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onFeedback={
                msg.role === "assistant"
                  ? (s) => handleFeedback(msg, s)
                  : undefined
              }
            />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </main>

      <ChatInput onSend={handleSend} loading={loading} />
    </div>
  );
}

function EmptyState({ onSend }: { onSend: (q: string) => void }) {
  const suggestions = [
    "TOR นี้ควรเสนอ SKU ไหน",
    "ลาป่วยกี่วันต้องมีใบแพทย์",
    "spec ของสินค้า X คืออะไร",
    "วิธีเบิกค่าเดินทางทำอย่างไร",
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center animate-fadein">
      {/* icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
        <svg
          className="h-8 w-8 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      {/* headline */}
      <div>
        <p className="text-lg font-bold text-gray-900">ถามอะไรก็ได้</p>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-gray-500">
          ระบบจะค้นหาและตอบจากเอกสารองค์กรคุณ
          <br />
          พร้อมอ้างอิงแหล่งที่มาทุกครั้ง
        </p>
      </div>

      {/* suggestion chips */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          ลองถามเช่น
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              onClick={() => onSend(q)}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md active:scale-[0.97]"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 justify-start animate-fadein">
      {/* AI avatar */}
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm">
        K
      </span>
      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center gap-1.5">
          {[0, 200, 400].map((delay) => (
            <span
              key={delay}
              className="dot-bounce h-2 w-2 rounded-full bg-blue-400"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
