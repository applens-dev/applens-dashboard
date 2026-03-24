import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Header from "../components/Header";
import { getUploads, type UploadJob } from "../api/uploads";

function formatTimestamp(ms: number): string {
  if (!Number.isFinite(ms)) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

function normalizeStatus(status: string): string {
  return status.trim().toUpperCase();
}

function statusBadgeClass(status: string): string {
  const normalized = normalizeStatus(status);
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

function clipMiddle(value: string, max = 40): string {
  if (value.length <= max) return value;
  const head = value.slice(0, Math.ceil(max * 0.55));
  const tail = value.slice(-Math.floor(max * 0.35));
  return `${head}...${tail}`;
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

  const summary = useMemo(() => {
    const counts = {
      succeeded: 0,
      building: 0,
      failed: 0,
      other: 0,
    };

    for (const job of sortedJobs) {
      const status = normalizeStatus(job.status);
      if (status === "SUCCEEDED") counts.succeeded += 1;
      else if (status === "BUILDING") counts.building += 1;
      else if (status === "FAILED") counts.failed += 1;
      else counts.other += 1;
    }

    return {
      total: sortedJobs.length,
      ...counts,
      latestUpdatedAt: sortedJobs[0]?.updatedAt ?? null,
    };
  }, [sortedJobs]);

  const completionRatio =
    summary.total > 0 ? Math.round((summary.succeeded / summary.total) * 100) : 0;
  const failedRatio =
    summary.total > 0 ? Math.round((summary.failed / summary.total) * 100) : 0;
  const buildingRatio =
    summary.total > 0 ? Math.round((summary.building / summary.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary) relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(42rem 24rem at 2% 4%, rgba(14, 165, 233, 0.11), transparent 64%), radial-gradient(42rem 24rem at 98% 10%, rgba(16, 185, 129, 0.1), transparent 66%), radial-gradient(54rem 32rem at 52% 105%, rgba(250, 204, 21, 0.06), transparent 68%)",
        }}
      />
      <Header title="Uploads" loggedIn />

      <div className="relative z-10 px-6 sm:px-10 lg:px-14 xl:px-20 pt-12 pb-20">
        <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase">
              Your Uploads
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
              Terraform Upload Jobs
            </h2>
            <p className="mt-3 text-sm text-(--text-secondary) max-w-2xl">
              Monitor pipeline progress, troubleshoot failures, and confirm plan
              and graph artifacts for each upload.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadJobs()}
            className="inline-flex items-center gap-2 px-5 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </>
            )}
          </button>
        </section>

        {error && (
          <div className="mt-6 border border-red-300/30 bg-red-400/10 rounded-xl px-5 py-4 text-sm text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="mt-6 border border-(--border) bg-black/25 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="px-6 py-6 sm:px-8 sm:py-7 border-b xl:border-b-0 xl:border-r border-(--border)">
              <p className="text-[11px] tracking-[0.14em] uppercase text-(--text-muted)">
                Pipeline Health
              </p>
              <div className="mt-4 h-3 w-full rounded-full bg-white/8 overflow-hidden">
                <div className="h-full w-full flex">
                  <div
                    className="bg-green-300/80"
                    style={{ width: `${completionRatio}%` }}
                  />
                  <div
                    className="bg-amber-300/80"
                    style={{ width: `${buildingRatio}%` }}
                  />
                  <div
                    className="bg-red-300/80"
                    style={{ width: `${failedRatio}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-(--text-secondary)">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-300/80" />
                  {summary.succeeded} succeeded
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-300/80" />
                  {summary.building} building
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-300/80" />
                  {summary.failed} failed
                </span>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-7">
              <p className="text-[11px] tracking-[0.14em] uppercase text-(--text-muted)">
                Snapshot
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-(--text-secondary)">Total jobs</span>
                  <span className="text-xl font-semibold">{summary.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-(--text-secondary)">
                    Completion rate
                  </span>
                  <span className="text-xl font-semibold">{completionRatio}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-(--text-secondary)">Last updated</span>
                  <span className="text-sm font-medium text-right">
                    {summary.latestUpdatedAt
                      ? formatTimestamp(summary.latestUpdatedAt)
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!isLoading && !error && sortedJobs.length === 0 && (
          <div className="mt-6 border border-(--border) bg-white/2 rounded-xl px-6 py-14 text-center">
            <p className="text-sm tracking-[0.12em] uppercase text-(--text-muted)">
              No upload jobs found
            </p>
            <p className="mt-2 text-sm text-(--text-secondary)">
              Start an import to create your first Terraform upload record.
            </p>
          </div>
        )}

        {sortedJobs.length > 0 && (
          <section className="mt-6 border border-(--border) bg-black/20 backdrop-blur-sm rounded-2xl overflow-hidden">
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 border-b border-(--border) text-[11px] tracking-[0.12em] uppercase text-(--text-muted)">
              <span className="col-span-3">Upload ID</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-3">Source Key</span>
              <span className="col-span-2">Artifacts</span>
              <span className="col-span-2 text-right">Updated</span>
            </div>

            {sortedJobs.map((job) => {
              const hasArtifacts = Boolean(job.planKey || job.graphKey);

              return (
                <article
                  key={job.uploadId}
                  className="px-5 lg:px-6 py-4 border-b border-(--border) last:border-b-0"
                >
                  <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center">
                    <div className="col-span-3 text-sm font-medium break-all">
                      {job.uploadId}
                    </div>

                    <div className="col-span-2">
                      <span
                        className={`inline-flex px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase border rounded-sm ${statusBadgeClass(job.status)}`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div
                      className="col-span-3 text-sm text-(--text-secondary)"
                      title={job.sourceKey}
                    >
                      {clipMiddle(job.sourceKey, 44)}
                    </div>

                    <div className="col-span-2 text-sm text-(--text-secondary)">
                      {hasArtifacts ? "Plan / Graph" : "Pending"}
                    </div>

                    <div className="col-span-2 text-sm text-(--text-secondary) text-right">
                      {formatTimestamp(job.updatedAt)}
                    </div>
                  </div>

                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-medium break-all">
                        {job.uploadId}
                      </p>
                      <span
                        className={`shrink-0 inline-flex px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase border rounded-sm ${statusBadgeClass(job.status)}`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <p className="text-(--text-muted) uppercase tracking-[0.08em]">
                        Updated
                      </p>
                      <p className="text-(--text-secondary) text-right">
                        {formatTimestamp(job.updatedAt)}
                      </p>

                      <p className="text-(--text-muted) uppercase tracking-[0.08em]">
                        Artifacts
                      </p>
                      <p className="text-(--text-secondary) text-right">
                        {hasArtifacts ? "Plan / Graph" : "Pending"}
                      </p>
                    </div>

                    <p className="text-xs text-(--text-secondary) break-all">
                      {job.sourceKey}
                    </p>
                  </div>

                  {job.lastError && (
                    <div className="mt-3 text-xs text-red-200 border border-red-300/30 bg-red-400/10 rounded-sm px-3 py-2 break-all">
                      Last error: {job.lastError}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {!error && isLoading && (
          <div className="mt-6 border border-(--border) bg-white/2 rounded-xl px-6 py-10 text-center text-(--text-secondary)">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading upload jobs...
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
