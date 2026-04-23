export const UPLOAD_STATUSES = [
  "PRESIGNED",
  "UPLOADED",
  "BUILDING",
  "PARSED",
  "ANALYZING",
  "SUCCEEDED",
  "FAILED",
] as const;

export type UploadStatus = (typeof UPLOAD_STATUSES)[number];

export function normalizeUploadStatus(status: string): string {
  return String(status || "").trim().toUpperCase();
}

export function isUploadInProgress(status: string): boolean {
  const normalized = normalizeUploadStatus(status);
  return (
    normalized === "PRESIGNED" ||
    normalized === "UPLOADED" ||
    normalized === "BUILDING" ||
    normalized === "PARSED" ||
    normalized === "ANALYZING"
  );
}

export function uploadStatusBadgeClass(status: string): string {
  const normalized = normalizeUploadStatus(status);

  if (normalized === "SUCCEEDED") {
    return "border-green-300/30 text-green-200 bg-green-400/10";
  }
  if (normalized === "FAILED") {
    return "border-red-300/30 text-red-200 bg-red-400/10";
  }
  if (isUploadInProgress(normalized)) {
    return "border-amber-300/30 text-amber-200 bg-amber-400/10";
  }
  return "border-(--border) text-(--text-secondary) bg-white/5";
}

export function formatUploadStatusLabel(status: string): string {
  const normalized = normalizeUploadStatus(status);
  if (!normalized) return "UNKNOWN";
  return normalized;
}
