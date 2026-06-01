/**
 * Next.js API route — POST /api/auth/login
 * Proxy ไป FastAPI แล้ว set httpOnly cookie (D1)
 * Client ไม่เห็น token เลย
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const upstream = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ detail: "เกิดข้อผิดพลาด" }));
    return NextResponse.json(err, { status: upstream.status });
  }

  const data = await upstream.json();
  const res = NextResponse.json({ role: data.role });

  res.cookies.set("kbase_token", data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: data.expires_in,
    path: "/",
  });

  return res;
}
