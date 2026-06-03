"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/store/auth";

export function Navbar() {
  const { role, clear } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clear();
    router.push("/login");
  }

  function navLink(href: string, label: string) {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          active
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/chat" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
            K
          </span>
          <span className="text-sm font-bold text-gray-900">KbaseSME</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLink("/chat", "ถามตอบ")}
          {role === "admin" && (
            <>
              {navLink("/admin/documents", "เอกสาร")}
              {navLink("/admin/logs", "ประวัติ")}
            </>
          )}
          <div className="ml-2 h-5 w-px bg-gray-200" />
          <button
            onClick={handleLogout}
            className="ml-1 rounded-md px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            ออกจากระบบ
          </button>
        </nav>
      </div>
    </header>
  );
}
