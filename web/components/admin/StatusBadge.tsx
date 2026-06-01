interface Props {
  status: string;
}

const config: Record<string, { label: string; cls: string }> = {
  active:     { label: "พร้อมใช้",    cls: "bg-green-100 text-green-700" },
  processing: { label: "กำลังประมวล", cls: "bg-blue-100 text-blue-700 animate-pulse" },
  deleted:    { label: "ลบแล้ว",      cls: "bg-gray-100 text-gray-500" },
  queued:     { label: "รอคิว",       cls: "bg-yellow-100 text-yellow-700" },
  done:       { label: "เสร็จแล้ว",   cls: "bg-green-100 text-green-700" },
  failed:     { label: "ผิดพลาด",     cls: "bg-red-100 text-red-600" },
};

export function StatusBadge({ status }: Props) {
  const c = config[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}
