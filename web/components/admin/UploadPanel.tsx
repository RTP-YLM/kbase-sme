"use client";

import { useRef, useState } from "react";

const DEPARTMENTS = ["hr", "accounting", "sales", "operations", "legal", "general"];
const DEPT_LABELS: Record<string, string> = {
  hr: "HR", accounting: "บัญชี", sales: "ขาย",
  operations: "Operations", legal: "กฎหมาย", general: "ทั่วไป",
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
    <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-blue-200 transition-all">
      {/* panel header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">อัปโหลดเอกสาร</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="ปิด">
          ✕
        </button>
      </div>

      <div className="px-4 py-4">
        {/* drop zone */}
        <div
          className={`mb-4 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging
              ? "border-blue-400 bg-blue-50"
              : file
              ? "border-blue-300 bg-blue-50/40"
              : "border-gray-300 hover:border-blue-300"
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.md,.txt,.xlsx"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
          />
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-blue-500">📄</span>
              <p className="text-sm font-medium text-gray-700">{file.name}</p>
              <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(0)} KB)</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">วางไฟล์ที่นี่ หรือคลิกเพื่อเลือก</p>
              <p className="mt-1 text-xs text-gray-400">PDF · DOCX · MD · TXT · XLSX (สูงสุด 50MB)</p>
            </>
          )}
        </div>
        {fileError && <p className="mb-3 text-xs text-red-600">⚠️ {fileError}</p>}

        {/* selectors + action */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">แผนก</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{DEPT_LABELS[d]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">การเข้าถึง</label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            >
              {ACCESS_LABELS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className="rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "กำลังส่ง…" : "อัปโหลด"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
