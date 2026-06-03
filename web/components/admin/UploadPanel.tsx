"use client";

import { useRef, useState } from "react";

const DEPARTMENTS = ["hr", "accounting", "sales", "operations", "legal", "general"];
const DEPT_LABELS: Record<string, string> = {
  hr: "HR",
  accounting: "บัญชี",
  sales: "ขาย",
  operations: "Operations",
  legal: "กฎหมาย",
  general: "ทั่วไป",
};
const ACCESS_LABELS = [
  { value: 1, label: "สาธารณะ" },
  { value: 2, label: "ภายในแผนก" },
  { value: 9, label: "ลับ" },
];
const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED = new Set([".pdf", ".docx", ".md", ".txt", ".xlsx"]);

interface Props {
  onClose: () => void;
  onSubmit: (file: File, department: string, accessLevel: number) => Promise<void>;
  submitting: boolean;
}

export function UploadPanel({ onClose, onSubmit, submitting }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [department, setDepartment] = useState("general");
  const [accessLevel, setAccessLevel] = useState(2);
  const [dragging, setDragging] = useState(false);

  function validate(f: File) {
    const ext = "." + f.name.split(".").pop()!.toLowerCase();
    if (!ALLOWED.has(ext)) return "รองรับเฉพาะ PDF, DOCX, MD, TXT, XLSX";
    if (f.size > MAX_BYTES) return "ไฟล์ใหญ่เกิน 50MB";
    return "";
  }

  function pick(f: File) {
    const err = validate(f);
    setFile(f);
    setFileError(err);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pick(f);
  }

  async function handleUpload() {
    if (!file || fileError || submitting) return;
    await onSubmit(file, department, accessLevel);
  }

  const canUpload = !!file && !fileError && !submitting;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-blue-200 animate-fadein">
      {/* panel header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-blue-50/50 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-blue-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-800">อัปโหลดเอกสาร</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="ปิด"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-5">
        {/* drop zone */}
        <div
          className={`mb-4 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            dragging
              ? "border-blue-500 bg-blue-50 scale-[1.01]"
              : file
              ? "border-blue-300 bg-blue-50/50"
              : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/20"
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.md,.txt,.xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
            }}
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <svg
                  className="h-5 w-5 text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </span>
              <p className="text-sm font-semibold text-gray-800">{file.name}</p>
              <p className="text-xs text-gray-400">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <svg
                  className="h-5 w-5 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <p className="text-sm text-gray-600">
                วางไฟล์ที่นี่ หรือ{" "}
                <span className="font-semibold text-blue-600">คลิกเพื่อเลือก</span>
              </p>
              <p className="text-xs text-gray-400">
                PDF · DOCX · MD · TXT · XLSX (สูงสุด 50MB)
              </p>
            </div>
          )}
        </div>

        {fileError && (
          <p className="mb-4 flex items-center gap-1.5 text-xs text-red-600">
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {fileError}
          </p>
        )}

        {/* selectors + action */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              แผนก
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {DEPT_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              การเข้าถึง
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(Number(e.target.value))}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {ACCESS_LABELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  กำลังส่ง…
                </>
              ) : (
                "อัปโหลด"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
