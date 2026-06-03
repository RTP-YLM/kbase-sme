/**
 * Generic API proxy — ส่ง request ไป FastAPI พร้อมแนบ Authorization header
 * จาก httpOnly cookie kbase_token (client ไม่แตะ token โดยตรง)
 *
 * สำคัญ: multipart/form-data (upload) ต้องส่ง body เป็น ArrayBuffer
 * ไม่ใช่ text — ไม่งั้น binary (file bytes) เสียหาย
 * และต้องไม่ override Content-Type เพราะ boundary จะหาย
 */
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

async function proxy(req: NextRequest, path: string) {
  const token = req.cookies.get("kbase_token")?.value;
  const url = `${API_URL}/${path}${req.nextUrl.search}`;

  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  // headers — inject Authorization, ส่ง Content-Type ผ่านตามต้นฉบับเสมอ
  // multipart ต้องการ boundary ใน Content-Type ห้ามตัดออก
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (contentType) headers["Content-Type"] = contentType;

  // body — multipart ต้องเป็น ArrayBuffer ไม่ใช่ text
  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = isMultipart
      ? await req.arrayBuffer()   // binary-safe
      : await req.text();          // JSON / plain text
  }

  const upstream = await fetch(url, {
    method: req.method,
    headers,
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
