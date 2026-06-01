"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { UploadModal } from "@/components/admin/UploadModal";

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
  hr: "HR", accounting: "บัญชี", sales: "ขาย",
  operations: "Operations", legal: "กฎหมาย", general: "ทั่วไป",
};

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/proxy/api/documents");
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleDelete(id: string) {
    await fetch(`/api/proxy/api/documents/${id}`, { method: "DELETE" });
    setDeleteId(null);
    fetchDocs();
  }

  const filtered = filter
    ? docs.filter((d) => d.department === filter)
    : docs;

  return (
    <AuthGuard require="admin">
      <div className="flex h-screen flex-col">
        <Navbar />

        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="mx-auto max-w-5xl px-4 py-6">

            {/* header */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">เอกสารทั้งหมด</h1>
              <button
                onClick={() => setShowUpload(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + อัปโหลด
              </button>
            </div>

            {/* filter */}
            <div className="mb-4 flex gap-2 flex-wrap">
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
                      <th className="px-4 py-3" />
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
                          <button
                            onClick={() => setDeleteId(doc.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>

        {/* upload modal */}
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onDone={fetchDocs}
          />
        )}

        {/* delete confirmation */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <p className="text-sm text-gray-800">ต้องการลบเอกสารนี้ใช่ไหม? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setDeleteId(null)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
                  ยกเลิก
                </button>
                <button onClick={() => handleDelete(deleteId)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
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
