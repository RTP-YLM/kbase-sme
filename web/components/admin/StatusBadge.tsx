interface Props {
  status: string;
}

const config: Record<string, { label: string; dot: string; cls: string }> = {
  active:     { label: "พร้อมใช้",    dot: "bg-green-500",  cls: "bg-green-50  text-green-700  ring-green-200" },
  processing: { label: "กำลังประมวล", dot: "bg-blue-500 animate-pulse",   cls: "bg-blue-50   text-blue-700   ring-blue-200"  },
  deleted:    { label: "ลบแล้ว",      dot: "bg-gray-400",   cls: "bg-gray-50   text-gray-500   ring-gray-200"  },
  queued:     { label: "รอคิว",       dot: "bg-amber-400",  cls: "bg-amber-50  text-amber-700  ring-amber-200" },
  done:       { label: "เสร็จแล้ว",   dot: "bg-green-500",  cls: "bg-green-50  text-green-700  ring-green-200" },
  failed:     { label: "ผิดพลาด",     dot: "bg-red-500",    cls: "bg-red-50    text-red-700    ring-red-200"   },
};

export function StatusBadge({ status }: Props) {
  const c = config[status] ?? { label: status, dot: "bg-gray-400", cls: "bg-gray-50 text-gray-600 ring-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${c.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
