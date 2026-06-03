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

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ─── upload ─────────────────────────────────────────────────────────────────
  async function handleUpload(file: File, department: string, accessLevel: number) {
    setSubmitting(true);

    const form = new FormData();
    form.append("file", file);
    form.append("department", department);
    form.append("access_level", String(accessLevel));

    const res = await fetch("/api/proxy/api/documents", { method: "POST", body: form });
    setSubmitting(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // show error toast immediately with a temp id
      const tempId = crypto.randomUUID();
      addJob({ id: tempId, filename: file.name, status: "failed", error: err.detail ?? "upload ล้มเหลว" });
      return;
    }

    const data = await res.json();

    // close panel → show toast
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
          // auto-dismiss success toast after 5 s
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
      const res = await fetch(`/api/proxy/api/documents/${id}/reindex`, { method: "POST" });
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

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen flex-col">
        <Navbar />

        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="mx-auto max-w-5xl px-4 py-6">

            {/* header */}
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">เอกสารทั้งหมด</h1>
              <button
                onClick={() => setShowUpload((v) => !v)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  showUpload
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {showUpload ? "✕ ปิด" : "+ อัปโหลด"}
              </button>
            </div>

            {/* inline upload panel */}
            {showUpload && (
              <UploadPanel
                onClose={() => setShowUpload(false)}
                onSubmit={handleUpload}
                submitting={submitting}
              />
            )}

            {/* filter tabs */}
            <div className="mb-4 flex flex-wrap gap-2">
              {["", "hr", "accounting", "sales", "operations", "legal", "general"].map((d) => (
                <button
                  key={d}
                  onClick={() => setFilter(d)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    filter === d
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {d ? (DEPT_LABELS[d] ?? d) : "ทั้งหมด"}
                </button>
              ))}
            </div>

            {/* table */}
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
              {loading ? (
                <div className="py-16 text-center text-sm text-gray-400">กำลังโหลด…</div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400">
                  ยังไม่มีเอกสาร — กด อัปโหลด เพื่อเริ่มต้น
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">ชื่อไฟล์</th>
                      <th className="px-4 py-3 font-medium">แผนก</th>
                      <th className="px-4 py-3 font-medium">ชิ้น</th>
                      <th className="px-4 py-3 font-medium">สถานะ</th>
                      <th className="px-4 py-3 font-medium">วันที่</th>
                      <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{doc.title}</p>
                          <p className="text-xs text-gray-400">{doc.filename}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {DEPT_LABELS[doc.department] ?? doc.department}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${
                            doc.chunk_count === 0 ? "text-red-600" :
                            doc.chunk_count < 3 ? "text-amber-600" : "text-gray-800"
                          }`}>
                            {doc.chunk_count}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(doc.created_at).toLocaleDateString("th-TH")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleReindex(doc.id)}
                              disabled={reindexingId === doc.id}
                              className="text-xs text-blue-500 hover:text-blue-700 disabled:opacity-40"
                              title="Re-index เอกสารใหม่"
                            >
                              {reindexingId === doc.id ? "กำลัง…" : "re-index"}
                            </button>
                            <button
                              onClick={() => setDeleteId(doc.id)}
                              className="text-xs text-red-500 hover:text-red-700"
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
            {!loading && (
              <p className="mt-3 text-right text-xs text-gray-400">
                {filtered.length} เอกสาร
                {filter ? ` ใน ${DEPT_LABELS[filter] ?? filter}` : ""}
              </p>
            )}

            {/* reindex error */}
            {reindexError && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-200">
                <span>⚠️ {reindexError}</span>
                <button onClick={() => setReindexError(null)} className="ml-3 text-red-400 hover:text-red-600">✕</button>
              </div>
            )}

          </div>
        </main>

        {/* floating job toasts */}
        <JobToast jobs={jobs} onDismiss={dismissJob} />

        {/* delete confirmation */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <p className="font-medium text-gray-900">ลบเอกสาร?</p>
              <p className="mt-1 text-sm text-gray-500">
                การกระทำนี้ไม่สามารถย้อนกลับได้ chunk ทั้งหมดจะถูกลบออกจากระบบ
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
