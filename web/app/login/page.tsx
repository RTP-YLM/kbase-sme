"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import type { Role } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
        return;
      }

      // token อยู่ใน httpOnly cookie แล้ว — เก็บแค่ role ใน store
      // ดึง profile เพิ่มเติมจาก /auth/me (mount ที่ /auth ไม่มี /api)
      const me = await fetch("/api/proxy/auth/me").then((r) =>
        r.ok ? r.json() : null
      );

      setUser({
        userId: me?.user_id ?? "",
        role: (data.role ?? "user") as Role,
        tenantId: me?.tenant_id ?? "",
        departments: me?.departments ?? [],
      });

      router.push(data.role === "admin" ? "/admin/documents" : "/chat");
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* left panel — brand */}
      <div className="hidden w-[420px] flex-col justify-between bg-blue-600 p-10 lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold text-white">K</span>
          <span className="text-base font-bold text-white">KbaseSME</span>
        </div>
        <div>
          <p className="text-2xl font-bold leading-snug text-white">
            ถามได้ทันที<br />ตอบจากเอกสารจริง
          </p>
          <p className="mt-3 text-sm text-blue-200">
            ระบบ AI ถามตอบจากเอกสารองค์กร พร้อมอ้างอิงแหล่งที่มา
          </p>
          <div className="mt-8 space-y-2 text-sm text-blue-100">
            {["ตอบจากเอกสารบริษัทคุณเท่านั้น", "อ้างอิงหน้าและหัวข้อทุกคำตอบ", "รองรับ LINE OA + Web"].map(f => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-blue-300">✓</span> {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-blue-300">KbaseSME © {new Date().getFullYear()}</p>
      </div>

      {/* right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">K</span>
            <span className="text-base font-bold text-gray-900">KbaseSME</span>
          </div>

          <h1 className="text-xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-gray-500">ยินดีต้อนรับกลับ</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@company.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
            >
              {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
