"use client";
/**
 * AuthGuard — ตรวจ session ครั้งแรก แล้ว redirect ถ้าไม่มี token
 * role: "admin" | "user" | null (null = ทุก role)
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth, type Role } from "@/store/auth";

interface Props {
  children: React.ReactNode;
  require?: Role; // ถ้าระบุ → ต้อง match role ด้วย
}

export function AuthGuard({ children, require }: Props) {
  const { userId, role, ready, setUser, clear } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready) return;

    // ดึง user profile จาก /api/proxy/api/auth/me
    fetch("/api/proxy/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then((data) => {
        setUser({
          userId: data.user_id,
          role: data.role,
          tenantId: data.tenant_id,
          departments: data.departments ?? [],
        });
      })
      .catch(() => {
        clear();
        router.replace("/login");
      });
  }, [ready, setUser, clear, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-gray-400">กำลังโหลด…</span>
      </div>
    );
  }

  if (!userId) return null; // redirect กำลังเกิด

  if (require && role !== require) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium text-red-600">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <button
          onClick={() => router.push("/chat")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
