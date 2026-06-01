/**
 * Auth store — Zustand
 * เก็บ role/tenant_id ที่ได้จาก GET /api/auth/me หลัง login
 * ไม่เก็บ token (อยู่ใน httpOnly cookie เท่านั้น — D1)
 */
import { create } from "zustand";

export type Role = "admin" | "user";

interface AuthState {
  userId: string | null;
  role: Role | null;
  tenantId: string | null;
  departments: string[];
  ready: boolean; // true หลังตรวจ session แล้ว
  setUser: (u: { userId: string; role: Role; tenantId: string; departments: string[] }) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  userId: null,
  role: null,
  tenantId: null,
  departments: [],
  ready: false,
  setUser: ({ userId, role, tenantId, departments }) =>
    set({ userId, role, tenantId, departments, ready: true }),
  clear: () =>
    set({ userId: null, role: null, tenantId: null, departments: [], ready: true }),
}));
