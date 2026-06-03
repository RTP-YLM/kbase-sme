"use client";

export interface JobItem {
  id: string; // job_id (or temp UUID ก่อนได้ job_id)
  filename: string;
  status: "queued" | "processing" | "done" | "failed";
  chunks?: number;
  error?: string;
}

interface Props {
  jobs: JobItem[];
  onDismiss: (id: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  queued: "รอประมวลผล…",
  processing: "กำลังแบ่งและเข้ารหัส…",
  done: "บันทึกเรียบร้อย",
  failed: "เกิดข้อผิดพลาด",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "done") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100">
        <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100">
        <svg className="h-4 w-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100">
        <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </span>
    );
  }
  // queued
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
      <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    </span>
  );
}

export function JobToast({ jobs, onDismiss }: Props) {
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {jobs.map((job) => (
        <div
          key={job.id}
          className={`flex w-76 animate-fadein items-start gap-3 rounded-2xl px-4 py-3.5 shadow-xl ring-1 transition-all ${
            job.status === "done"
              ? "bg-green-50 ring-green-200"
              : job.status === "failed"
              ? "bg-red-50 ring-red-200"
              : "bg-white ring-gray-200"
          }`}
        >
          {/* status icon */}
          <StatusIcon status={job.status} />

          {/* content */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-800">
              {job.filename}
            </p>
            <p
              className={`mt-0.5 text-xs ${
                job.status === "failed" ? "text-red-600" : "text-gray-500"
              }`}
            >
              {job.error ?? STATUS_LABEL[job.status] ?? job.status}
            </p>
            {job.status === "done" && job.chunks !== undefined && (
              <p className="mt-0.5 text-[10px] text-gray-400">
                แบ่งได้ {job.chunks} chunk
                {job.chunks < 3 && (
                  <span className="ml-1 font-medium text-amber-500">
                    — อาจเป็นไฟล์สแกน
                  </span>
                )}
              </p>
            )}

            {/* progress bar for active states */}
            {(job.status === "queued" || job.status === "processing") && (
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    job.status === "processing"
                      ? "animate-pulse bg-blue-500"
                      : "animate-pulse bg-amber-400"
                  }`}
                  style={{
                    width: job.status === "processing" ? "65%" : "25%",
                  }}
                />
              </div>
            )}
          </div>

          {/* dismiss (only when terminal) */}
          {(job.status === "done" || job.status === "failed") && (
            <button
              onClick={() => onDismiss(job.id)}
              className="shrink-0 text-gray-300 transition-colors hover:text-gray-600"
              aria-label="ปิด"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
