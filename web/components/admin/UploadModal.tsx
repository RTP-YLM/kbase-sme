"use client";

import { useRef, useState } from "react";
import { StatusBadge } from "./StatusBadge";

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
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED = new Set([".pdf", ".docx", ".md", ".txt", ".xlsx"]);

interface JobState {
  job_id: string;
  status: string;
  chunks?: number;
  error?: string;
}

interface Props {
  onClose: () => void;
  onDone: () => void;
}

export function UploadModal({ onClose, onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [department, setDepartment] = useState("general");
  const [accessLevel, setAccessLevel] = useState(2);
  const [job, setJob] = useState<JobState | null>(null);
  const [uploading, setUploading] = useState(false);

  // stage labels ตาม data-prep spec
  const STAGE_LABELS: Record<string, string> = {
    queued:     "กำลังอ่านไฟล์…",
    processing: "กำลังแบ่งและเข้ารหัสเนื้อหา…",
    done:       "บันทึกเรียบร้อย ✓",
    failed:     "เกิดข้อผิดพลาด",
  };

  function validateFile(f: File) {
    const ext = "." + f.name.split(".").pop()!.toLowerCase();
    if (!ALLOWED.has(ext)) {
      return "รองรับเฉพาะ PDF, DOCX, MD, TXT, XLSX";
    }
    if (f.size > MAX_BYTES) {
      return "ไฟล์ใหญ่เกิน 50MB กรุณาแบ่งไฟล์";
    }
    return "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setFileError(f ? validateFile(f) : "");
  }

  async function handleUpload() {
    if (!file || fileError) return;
    setUploading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("department", department);
    form.append("access_level", String(accessLevel));

    const res = await fetch("/api/proxy/api/documents", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setJob({ job_id: "", status: "failed", error: err.detail ?? "upload ล้มเหลว" });
      setUploading(false);
      return;
    }

    const data = await res.json();
    setJob({ job_id: data.job_id, status: "queued" });
    pollJob(data.job_id);
  }

  async function pollJob(jobId: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/proxy/api/documents/jobs/${jobId}`);
      if (!res.ok) return;
      const data = await res.json();
      setJob(data);
      if (data.status === "done" || data.status === "failed") {
        clearInterval(interval);
        setUploading(false);
        if (data.status === "done") {
          setTimeout(() => { onDone(); onClose(); }, 1500);
        }
      }
    }, 2000);
  }

  const canUpload = !!file && !fileError && !uploading && !job;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">อัปโหลดเอกสาร</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* file picker */}
        <div
          className="mb-4 cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-400"
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file"
            accept=".pdf,.docx,.md,.txt,.xlsx" className="hidden" onChange={onFileChange} />
          {file ? (
            <p className="text-sm font-medium text-gray-700">{file.name}</p>
          ) : (
            <>
              <p className="text-sm text-gray-500">คลิกเพื่อเลือกไฟล์</p>
              <p className="mt-1 text-xs text-gray-400">PDF · DOCX · MD · TXT · XLSX (สูงสุด 50MB)</p>
            </>
          )}
        </div>
        {fileError && <p className="mb-3 text-xs text-red-600">{fileError}</p>}

        {/* metadata */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">แผนก</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{DEPT_LABELS[d]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">ระดับการเข้าถึง</label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              {ACCESS_LABELS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* progress */}
        {job && (
          <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">{STAGE_LABELS[job.status] ?? job.status}</p>
              <StatusBadge status={job.status} />
            </div>
            {job.chunks !== undefined && job.status === "done" && (
              <p className="mt-1 text-xs text-gray-500">
                แบ่งได้ {job.chunks} ชิ้น
                {job.chunks < 3 && (
                  <span className="ml-1 text-amber-600">⚠️ น้อยกว่าปกติ อาจเป็นไฟล์สแกน</span>
                )}
              </p>
            )}
            {job.error && <p className="mt-1 text-xs text-red-600">{job.error}</p>}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            ยกเลิก
          </button>
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            อัปโหลด
          </button>
        </div>
      </div>
    </div>
  );
}
