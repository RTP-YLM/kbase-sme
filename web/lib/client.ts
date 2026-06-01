/**
 * API client — openapi-fetch + httpOnly cookie auth
 * token อยู่ใน cookie เท่านั้น (D1: httpOnly), client ไม่แตะ token โดยตรง
 */
import createClient from "openapi-fetch";
import type { paths } from "./api.d";

export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  credentials: "include", // ส่ง cookie ทุก request อัตโนมัติ
});
