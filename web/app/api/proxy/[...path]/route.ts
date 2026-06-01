/**
 * Generic API proxy — ส่ง request ไป FastAPI พร้อมแนบ Authorization header
 * จาก httpOnly cookie kbase_token (client ไม่แตะ token โดยตรง)
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

async function proxy(req: NextRequest, path: string) {
  const token = req.cookies.get("kbase_token")?.value;
  const url = `${API_URL}/${path}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") ?? "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await req.text()
    : undefined;

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body,
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path.join("/"));
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path.join("/"));
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path.join("/"));
}
