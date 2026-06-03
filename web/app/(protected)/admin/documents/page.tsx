"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { UploadPanel } from "@/components/admin/UploadPanel";
import { JobToast, type JobItem } from "@/components/admin/JobToast";

interface DocumentInfo {
  id: string;
  filename: string;
  title: string;
  department: string;
  status: string;
  chunk_count: number;
  created_at: string;
}

const DEPT_LABELS: Record<string, string> = {
  hr: "HR",
  accounting: "บัญชี",
  finance: "การเงิน",
  sales: "ขาย",
  operations: "Operations",
  legal: "กฎหมาย",
  general: "ทั่วไป",
};

const FILTER_OPTS = [
  { value: "", label: "ทั้งหมด" },
  { value: "hr", label: "HR" },
  { value: "accounting", label: "บัญชี" },
  { value: "sales", label: "ขาย" },
  { value: "operations", label: "Operations" },
  { value: "legal", label: "กฎหมาย" },
  { value: "general", label: "ทั่วไป" },
];

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [reindexError, setReindexError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  // async job toasts
  const [jobs, setJobs] = useState<JobItem[]>([]);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/proxy/api/documents");
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // ─── upload ─────────────────────────────────────────────────────────────────
  async function handleUpload(
    file: File,
    department: string,
    accessLevel: number
  ) {
    setSubmitting(true);

    const form = new FormData();
    form.append("file", file);
    form.append("department", department);
    form.append("access_level", String(accessLevel));

    const res = await fetch("/api/proxy/api/documents", {
      method: "POST",
      body: form,
    });
    setSubmitting(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const tempId = crypto.randomUUID();
      addJob({
        id: tempId,
        filename: file.name,
        status: "failed",
        error: err.detail ?? "upload ล้มเหลว",
      });
      return;
    }

    const data = await res.json();

    setShowUpload(false);
    addJob({ id: data.job_id, filename: file.name, status: "queued" });
    pollJob(data.job_id);
  }

  function addJob(job: JobItem) {
    setJobs((prev) => [job, ...prev]);
  }

  function updateJob(id: string, patch: Partial<JobItem>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  function dismissJob(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  function pollJob(jobId: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/proxy/api/documents/jobs/${jobId}`);
      if (!res.ok) return;
      const data = await res.json();

      updateJob(jobId, {
        status: data.status,
        chunks: data.chunks,
        error: data.error,
      });

      if (data.status === "done" || data.status === "failed") {
        clearInterval(interval);
        if (data.status === "done") {
          fetchDocs();
          setTimeout(() => dismissJob(jobId), 5000);
        }
      }
    }, 2000);
  }

  // ─── delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    await fetch(`/api/proxy/api/documents/${id}`, { method: "DELETE" });
    setDeleteId(null);
    fetchDocs();
  }

  // ─── reindex ─────────────────────────────────────────────────────────────────
  async function handleReindex(id: string) {
    setReindexingId(id);
    setReindexError(null);
    try {
      const res = await fetch(`/api/proxy/api/documents/${id}/reindex`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setReindexError(err.detail ?? `re-index ล้มเหลว (${res.status})`);
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
      fetchDocs();
    } catch {
      setReindexError("re-index ล้มเหลว — กรุณาลองใหม่");
    } finally {
      setReindexingId(null);
    }
  }

  const filtered = filter ? docs.filter((d) => d.department === filter) : docs;
  const activeCount = docs.filter((d) => d.status === "active").length;

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen flex-col">
        <Navbar />

        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="mx-auto max-w-5xl px-4 py-6">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">เอกสารทั้งหมด</h1>
                <p className="mt-0.5 text-sm text-gray-500">
                  {docs.length} เอกสาร · {activeCount} พร้อมใช้งาน
                </p>
              </div>
              <button
                onClick={() => setShowUpload((v) => !v)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] ${
                  showUpload
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                }`}
              >
                {showUpload ? (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    ปิด
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    อัปโหลด
                  </>
                )}
              </button>
            </div>

            {/* ── Upload panel ────────────────────────────────────────────────── */}
            {showUpload && (
              <UploadPanel
                onClose={() => setShowUpload(false)}
                onSubmit={handleUpload}
                submitting={submitting}
              />
            )}

            {/* ── Segmented filter ────────────────────────────────────────────── */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {FILTER_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    filter === opt.value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 hover:ring-gray-300"
                  }`}
                >
                  {opt.label}
                  {opt.value === "" && docs.length > 0 && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0 text-[10px] font-bold ${
                      filter === "" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      {docs.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Table ───────────────────────────────────────────────────────── */}
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-20 text-sm text-gray-400">
                  <svg className="h-6 w-6 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  กำลังโหลด…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p className="text-sm text-gray-500">
                    {filter ? `ไม่มีเอกสารในแผนก ${DEPT_LABELS[filter] ?? filter}` : "ยังไม่มีเอกสาร"}
                  </p>
                  {!filter && (
                    <p className="text-xs text-gray-400">กดปุ่ม &ldquo;อัปโหลด&rdquo; เพื่อเพิ่มเอกสารแรก</p>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">ชื่อไฟล์</th>
                      <th className="px-4 py-3 font-semibold">แผนก</th>
                      <th className="px-4 py-3 font-semibold">chunk</th>
                      <th className="px-4 py-3 font-semibold">สถานะ</th>
                      <th className="px-4 py-3 font-semibold">วันที่</th>
                      <th className="px-4 py-3 font-semibold text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((doc) => (
                      <tr
                        key={doc.id}
                        className="group transition-colors hover:bg-blue-50/30"
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-gray-900">{doc.title}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{doc.filename}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            {DEPT_LABELS[doc.department] ?? doc.department}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`font-semibold tabular-nums ${
                              doc.chunk_count === 0
                                ? "text-red-600"
                                : doc.chunk_count < 3
                                ? "text-amber-600"
                                : "text-gray-700"
                            }`}
                          >
                            {doc.chunk_count}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-400">
                          {new Date(doc.created_at).toLocaleDateString("th-TH")}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReindex(doc.id)}
                              disabled={reindexingId === doc.id}
                              className="rounded-lg px-2.5 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-40"
                              title="Re-index เอกสารใหม่"
                            >
                              {reindexingId === doc.id ? (
                                <span className="flex items-center gap-1">
                                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                  </svg>
                                  กำลัง…
                                </span>
                              ) : (
                                "re-index"
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteId(doc.id)}
                              className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                            >
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* document count */}
            {!loading && filtered.length > 0 && (
              <p className="mt-3 text-right text-xs text-gray-400">
                แสดง {filtered.length} จาก {docs.length} เอกสาร
                {filter ? ` (กรอง: ${DEPT_LABELS[filter] ?? filter})` : ""}
              </p>
            )}

            {/* reindex error */}
            {reindexError && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {reindexError}
                </span>
                <button
                  onClick={() => setReindexError(null)}
                  className="ml-3 shrink-0 text-red-400 hover:text-red-600"
                  aria-label="ปิด"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </main>

        {/* floating job toasts */}
        <JobToast jobs={jobs} onDismiss={dismissJob} />

        {/* ── Delete confirmation dialog ───────────────────────────────────── */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm animate-fadein rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-200">
              {/* icon */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-900">ยืนยันการลบเอกสาร</h2>
              <p className="mt-1.5 text-sm text-gray-500">
                การกระทำนี้ไม่สามารถย้อนกลับได้ chunk ทั้งหมดจะถูกลบออกจากระบบ AI
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 active:scale-[0.98]"
                >
                  ลบเอกสาร
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
