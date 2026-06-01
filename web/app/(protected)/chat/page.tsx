"use client";

import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { MessageBubble, type Message } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { useAuth } from "@/store/auth";

export default function ChatPage() {
  const { departments } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // scroll to bottom เมื่อมี message ใหม่
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(question: string) {
    // เพิ่ม user bubble ทันที
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
          department: departments[0] ?? null, // D1: ส่ง department จาก token
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answered
          ? data.answer
          : "ขออภัย ไม่พบข้อมูลที่เกี่ยวข้องในเอกสารที่มีอยู่ กรุณาติดต่อผู้รับผิดชอบโดยตรง",
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
      body: JSON.stringify({ question: msg.content, feedback: sentiment }),
    }).catch(() => {}); // fire-and-forget
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar />

      {/* message thread */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          {messages.length === 0 && (
            <EmptyState />
          )}
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="text-4xl">💬</div>
      <p className="text-base font-medium text-gray-700">ถามอะไรได้เลย</p>
      <p className="max-w-xs text-sm text-gray-400">
        ระบบจะตอบจากเอกสารขององค์กรคุณ พร้อมอ้างอิงแหล่งที่มา
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {[
          "TOR นี้ควรเสนอ SKU ไหน",
          "spec ของ product X คืออะไร",
          "ลาป่วยกี่วันต้องมีใบแพทย์",
        ].map((q) => (
          <span
            key={q}
            className="cursor-default rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500"
          >
            {q}
          </span>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
        <div className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
