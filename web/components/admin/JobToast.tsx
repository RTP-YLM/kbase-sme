"use client";

export interface JobItem {
  id: string;         // job_id (or temp UUID ก่อนได้ job_id)
  filename: string;
  status: "queued" | "processing" | "done" | "failed";
  chunks?: number;
  error?: string;
}

interface Props {
  jobs: JobItem[];
  onDismiss: (id: string) => void;
}

const STATUS_ICON: Record<string, string> = {
  queued:     "⏳",
  processing: "⚙️",
  done:       "✅",
  failed:     "❌",
};

const STATUS_LABEL: Record<string, string> = {
  queued:     "รอประมวลผล…",
  processing: "กำลังแบ่งและเข้ารหัส…",
  done:       "บันทึกเรียบร้อย",
  failed:     "เกิดข้อผิดพลาด",
};

export function JobToast({ jobs, onDismiss }: Props) {
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {jobs.map((job) => (
        <div
          key={job.id}
          className={`flex w-72 items-start gap-3 rounded-xl px-4 py-3 shadow-lg ring-1 transition-all ${
            job.status === "done"
              ? "bg-green-50 ring-green-200"
              : job.status === "failed"
              ? "bg-red-50 ring-red-200"
              : "bg-white ring-gray-200"
          }`}
        >
          {/* icon */}
          <span className="mt-0.5 text-base leading-none">
            {STATUS_ICON[job.status] ?? "📄"}
          </span>

          {/* content */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-800">{job.filename}</p>
            <p className={`mt-0.5 text-xs ${
              job.status === "failed" ? "text-red-600" : "text-gray-500"
            }`}>
              {job.error ?? STATUS_LABEL[job.status] ?? job.status}
            </p>
            {job.status === "done" && job.chunks !== undefined && (
              <p className="mt-0.5 text-[10px] text-gray-400">
                แบ่งได้ {job.chunks} ชิ้น
                {job.chunks < 3 && (
                  <span className="ml-1 text-amber-500">⚠️ อาจเป็นไฟล์สแกน</span>
                )}
              </p>
            )}
            {/* progress bar for active */}
            {(job.status === "queued" || job.status === "processing") && (
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full ${
                    job.status === "processing" ? "bg-blue-500" : "bg-amber-400"
                  } animate-pulse`}
                  style={{ width: job.status === "processing" ? "65%" : "25%" }}
                />
              </div>
            )}
          </div>

          {/* dismiss (only when terminal) */}
          {(job.status === "done" || job.status === "failed") && (
            <button
              onClick={() => onDismiss(job.id)}
              className="shrink-0 text-gray-300 hover:text-gray-500"
              aria-label="ปิด"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
