"use client";

import { useRef } from "react";

interface Props {
  onSend: (text: string) => void;
  loading: boolean;
}

export function ChatInput({ onSend, loading }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    // Enter ส่ง, Shift+Enter ขึ้นบรรทัดใหม่
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const text = ref.current?.value.trim();
    if (!text || loading) return;
    onSend(text);
    if (ref.current) {
      ref.current.value = "";
      ref.current.style.height = "auto";
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-1px_8px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex max-w-3xl items-end gap-3">
        <div className="flex flex-1 items-end rounded-2xl border border-gray-300 bg-white px-4 py-2.5 shadow-sm transition-shadow focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
          <textarea
            ref={ref}
            rows={1}
            disabled={loading}
            onKeyDown={handleKeyDown}
            placeholder="พิมพ์คำถามของคุณ… (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัด)"
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-60"
            style={{ maxHeight: 120 }}
            onInput={(e) => {
              // auto-grow
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
        </div>

        {/* send button */}
        <button
          onClick={submit}
          disabled={loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="ส่ง"
        >
          {loading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>

      <p className="mt-1.5 text-center text-[11px] text-gray-400">
        ระบบตอบจากเอกสารองค์กรเท่านั้น — ตรวจสอบข้อมูลสำคัญกับผู้รับผิดชอบเสมอ
      </p>
    </div>
  );
}
