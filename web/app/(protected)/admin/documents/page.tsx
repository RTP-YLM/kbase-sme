import { AuthGuard } from "@/components/AuthGuard";
import { Navbar } from "@/components/Navbar";

// E5-2 placeholder — Admin Documents build ถัดไป
export default function AdminDocumentsPage() {
  return (
    <AuthGuard require="admin">
      <Navbar />
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-400">กำลังพัฒนา Admin Documents… (E5-2)</p>
      </main>
    </AuthGuard>
  );
}
