import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { getUploads, type UploadJob } from "../api/uploads";

function formatTimestamp(ms: number): string {
  if (!Number.isFinite(ms)) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

function statusBadgeClass(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "SUCCEEDED") {
    return "border-green-300/30 text-green-200 bg-green-400/10";
  }
  if (normalized === "FAILED") {
    return "border-red-300/30 text-red-200 bg-red-400/10";
  }
  if (normalized === "BUILDING") {
    return "border-amber-300/30 text-amber-200 bg-amber-400/10";
  }
  return "border-(--border) text-(--text-secondary) bg-white/5";
}

export default function UploadsPage() {
  const { getAccessTokenSilently } = useAuth0();
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });

      const data = await getUploads(accessToken);
      setJobs(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load uploads.");
    } finally {
      setIsLoading(false);
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => b.updatedAt - a.updatedAt),
    [jobs],
  );

  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header title="Uploads" loggedIn />

      <div className="px-10 sm:px-16 lg:px-20 pt-16 pb-20">
        <div className="w-full">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase mb-2">
                Upload Jobs
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold">
                Your Terraform uploads
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void loadJobs()}
              className="px-6 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="mb-6 border border-red-300/30 bg-red-400/10 rounded-xl px-5 py-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {!isLoading && !error && sortedJobs.length === 0 && (
            <div className="border border-(--border) bg-white/2 rounded-xl px-6 py-12 text-center">
              <p className="text-sm tracking-[0.12em] uppercase text-(--text-muted)">
                No upload jobs found
              </p>
            </div>
          )}

          {sortedJobs.length > 0 && (
            <div className="border border-(--border) bg-white/2 rounded-xl overflow-hidden">
              <div className="hidden md:grid md:grid-cols-12 px-5 py-3 border-b border-(--border) text-[11px] tracking-[0.12em] uppercase text-(--text-muted)">
                <span className="col-span-4">Upload ID</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-3 col-start-10 text-right">
                  Uploaded
                </span>
              </div>

              {sortedJobs.map((job) => (
                <div
                  key={job.uploadId}
                  className="px-5 py-4 border-b border-(--border) last:border-b-0"
                >
                  <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                    <div className="col-span-4 text-sm font-medium break-all">
                      {job.uploadId}
                    </div>

                    <div className="col-span-2 mt-2 md:mt-0">
                      <span
                        className={`inline-flex px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase border rounded-sm ${statusBadgeClass(job.status)}`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="col-span-3 col-start-10 mt-2 md:mt-0 text-sm text-(--text-secondary) md:text-right">
                      {formatTimestamp(job.updatedAt)}
                    </div>
                  </div>

                  {job.lastError && (
                    <div className="mt-3 text-xs text-red-200 border border-red-300/30 bg-red-400/10 rounded-sm px-3 py-2 break-all">
                      Last error: {job.lastError}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
