"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";
import type { Role } from "@/store/auth";

const FEATURES = [
  "ตอบจากเอกสารบริษัทคุณเท่านั้น",
  "อ้างอิงหน้าและหัวข้อทุกคำตอบ",
  "รองรับทีมหลายแผนก + LINE OA",
];

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
    <div className="flex min-h-screen bg-white">
      {/* ── Left panel — brand ─────────────────────────────────────────────── */}
      <div className="relative hidden w-[440px] flex-col overflow-hidden bg-blue-600 lg:flex">
        {/* subtle geometric pattern */}
        <svg
          className="absolute inset-0 h-full w-full opacity-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* large decorative circle */}
        <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-10">
          {/* logo */}
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-base font-bold text-white shadow-inner">
              K
            </span>
            <span className="text-base font-bold tracking-tight text-white">
              Kbase<span className="text-blue-200">SME</span>
            </span>
          </div>

          {/* headline */}
          <div>
            <p className="text-3xl font-bold leading-tight text-white">
              ถามได้ทันที
              <br />
              <span className="text-blue-200">ตอบจากเอกสารจริง</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-blue-200">
              ระบบ AI ถามตอบจากเอกสารองค์กร<br />
              พร้อมอ้างอิงแหล่งที่มาทุกคำตอบ
            </p>

            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-blue-100">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-blue-400">
            KbaseSME &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm animate-fadein">
          {/* mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
              K
            </span>
            <span className="text-sm font-bold tracking-tight text-gray-900">
              Kbase<span className="text-blue-600">SME</span>
            </span>
          </div>

          {/* card */}
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
            <h1 className="text-xl font-bold text-gray-900">เข้าสู่ระบบ</h1>
            <p className="mt-1 text-sm text-gray-500">ยินดีต้อนรับกลับ</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              {/* email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  อีเมล
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* error */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
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
                  {error}
                </div>
              )}

              {/* submit */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
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
                    กำลังเข้าสู่ระบบ…
                  </span>
                ) : (
                  "เข้าสู่ระบบ"
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            ข้อมูลทั้งหมดเข้ารหัสและปลอดภัย
          </p>
        </div>
      </div>
    </div>
  );
}
