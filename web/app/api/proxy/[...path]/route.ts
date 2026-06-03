/**
 * Generic API proxy — ส่ง request ไป FastAPI พร้อมแนบ Authorization header
 * จาก httpOnly cookie kbase_token (client ไม่แตะ token โดยตรง)
 *
 * multipart/form-data: ใช้ req.formData() แล้วส่งต่อเป็น FormData
 * (ไม่ต้องจัดการ binary/boundary เอง — fetch() ทำให้)
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

async function proxy(req: NextRequest, path: string) {
  const token = req.cookies.get("kbase_token")?.value;
  const url = `${API_URL}/${path}${req.nextUrl.search}`;
  const contentType = req.headers.get("content-type") ?? "";

  const authHeaders: Record<string, string> = {};
  if (token) authHeaders["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  let extraHeaders: Record<string, string> = {};

  if (req.method !== "GET" && req.method !== "HEAD") {
    if (contentType.includes("multipart/form-data")) {
      // parse FormData แล้วส่งต่อ — fetch() จะ set Content-Type + boundary ใหม่ให้เอง
      body = await req.formData();
      // ไม่ต้อง set Content-Type (ห้าม set ไม่งั้น boundary หาย)
    } else {
      // JSON / plain text
      body = await req.text();
      if (contentType) extraHeaders["Content-Type"] = contentType;
    }
  }

  const upstream = await fetch(url, {
    method: req.method,
    headers: { ...authHeaders, ...extraHeaders },
    body,
  });

  const data = await upstream.arrayBuffer();
  return new NextResponse(data, {
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
