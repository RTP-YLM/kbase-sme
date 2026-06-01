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

        {/* source citations — ใต้ bubble ผู้ช่วย */}
        {!isUser && message.sources && message.answered !== false && (
          <SourceCitation sources={message.sources} />
        )}

        {/* feedback buttons — เฉพาะ assistant ที่ตอบได้ */}
        {!isUser && message.answered && onFeedback && (
          <div className="mt-1.5 flex gap-1.5">
            {[
              { label: "✓ ถูกต้อง", value: "correct" as const, cls: "text-green-700 hover:bg-green-50" },
              { label: "✗ ไม่ถูก", value: "wrong" as const, cls: "text-red-600 hover:bg-red-50" },
              { label: "? ไม่ชัดเจน", value: "unclear" as const, cls: "text-gray-500 hover:bg-gray-100" },
            ].map((btn) => (
              <button
                key={btn.value}
                onClick={() => onFeedback(btn.value)}
                className={`rounded-md px-2 py-0.5 text-xs ${btn.cls}`}
              >
                {btn.label}
              </button>
            ))}
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
