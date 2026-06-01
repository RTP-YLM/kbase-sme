"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";

export function Navbar() {
  const { role, clear } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clear();
    router.push("/login");
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/chat" className="text-base font-bold text-blue-600">
          KbaseSME
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/chat" className="text-gray-600 hover:text-gray-900">
            ถามตอบ
          </Link>
          {role === "admin" && (
            <>
              <Link href="/admin/documents" className="text-gray-600 hover:text-gray-900">
                เอกสาร
              </Link>
              <Link href="/admin/logs" className="text-gray-600 hover:text-gray-900">
                ประวัติ
              </Link>
            </>
          )}
          <button
            onClick={handleLogout}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200"
          >
            ออกจากระบบ
          </button>
        </nav>
      </div>
    </header>
  );
}
