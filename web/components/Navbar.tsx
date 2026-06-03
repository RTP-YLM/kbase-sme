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
        className={`relative px-3 py-1.5 text-sm font-medium transition-colors rounded-md ${
          active
            ? "text-blue-700 bg-blue-50"
            : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
        }`}
      >
        {label}
        {active && (
          <span className="absolute bottom-0 left-1/2 h-0.5 w-4/5 -translate-x-1/2 rounded-full bg-blue-600" />
        )}
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/chat" className="group flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-105">
            K
          </span>
          <span className="text-sm font-bold tracking-tight text-gray-900">
            Kbase<span className="text-blue-600">SME</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          {navLink("/chat", "ถามตอบ")}
          {role === "admin" && (
            <>
              {navLink("/admin/documents", "เอกสาร")}
              {navLink("/admin/logs", "ประวัติ")}
            </>
          )}
          <div className="mx-2 h-5 w-px bg-gray-200" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            {/* logout icon */}
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            ออก
          </button>
        </nav>
      </div>
    </header>
  );
}
