import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ status: "ok" });
  res.cookies.delete("kbase_token");
  return res;
}
