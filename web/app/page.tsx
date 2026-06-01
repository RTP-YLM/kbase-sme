import { redirect } from "next/navigation";

// root → ส่งไป /login เสมอ (AuthGuard จัดการ redirect ต่อถ้า session ยังอยู่)
export default function Root() {
  redirect("/login");
}
