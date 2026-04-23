import { useAuth0 } from "@auth0/auth0-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CloudUpload,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Header from "../components/Header";
import {
  completeTerraformUpload,
  deleteUpload,
  getUploads,
  presignTerraformUpload,
  uploadFileToPresignedUrl,
  type UploadJob,
} from "../api/uploads";
import { getMe } from "../api/user";
import {
  formatUploadStatusLabel,
  isUploadInProgress,
  normalizeUploadStatus,
  uploadStatusBadgeClass,
} from "../types/uploadStatus";
import AppButton from "../components/AppButton";

const MAX_BYTES = 10 * 1024 * 1024;

const SUPPORTED_FILE_TYPES: Record<string, string> = {
  ".tf": "text/plain",
  ".tfvars": "text/plain",
  ".zip": "application/zip",
  ".tar": "application/x-tar",
  ".tgz": "application/gzip",
  ".tar.gz": "application/gzip",
};

function formatTimestamp(ms: number): string {
  if (!Number.isFinite(ms)) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

function displayUploadName(name: string | null | undefined): string {
  if (!name || !name.trim()) {
    return "default";
  }
  return name;
}

function prettyBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getSupportedContentType(filename: string): string | null {
  const name = filename.toLowerCase();
  const suffixes = Object.keys(SUPPORTED_FILE_TYPES).sort(
    (a, b) => b.length - a.length,
  );

  const matchedSuffix = suffixes.find((suffix) => name.endsWith(suffix));
  return matchedSuffix ? SUPPORTED_FILE_TYPES[matchedSuffix] : null;
}

function isTerraformLikeFile(file: File) {
  return getSupportedContentType(file.name) !== null;
}

export default function HomePage() {
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect } =
    useAuth0();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [isNewUploadDialogOpen, setIsNewUploadDialogOpen] = useState(false);
  const [dialogUploadName, setDialogUploadName] = useState("");
  const [dialogUploadNameInteracted, setDialogUploadNameInteracted] = useState(false);
  const [dialogFile, setDialogFile] = useState<File | null>(null);
  const [dialogIsDragging, setDialogIsDragging] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogProgress, setDialogProgress] = useState<number>(0);
  const [dialogStatus, setDialogStatus] = useState<
    "idle" | "presigning" | "uploading" | "done"
  >("idle");
  const [isUploadSuccessDialogOpen, setIsUploadSuccessDialogOpen] = useState(false);
  const [successUploadName, setSuccessUploadName] = useState("");
  const [deleteDialogUpload, setDeleteDialogUpload] = useState<UploadJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
  const [animatePipelineHealth, setAnimatePipelineHealth] = useState(false);
  const [awsConnected, setAwsConnected] = useState<boolean | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });

      const [data, profile] = await Promise.all([
        getUploads(accessToken),
        getMe(accessToken).catch(() => null),
      ]);
      setJobs(data);
      if (profile) {
        setAwsConnected(Boolean(profile.awsConnected));
      } else {
        setAwsConnected(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load uploads.");
    } finally {
      setIsLoading(false);
    }
  }, [getAccessTokenSilently]);

  const handleDeleteUpload = useCallback(
    async (uploadId: string) => {
      try {
        setDeletingUploadId(uploadId);
        setError(null);

        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });

        await deleteUpload(uploadId, accessToken);
        setJobs((prev) => prev.filter((job) => job.uploadId !== uploadId));
        setDeleteDialogUpload((prev) =>
          prev?.uploadId === uploadId ? null : prev,
        );
      } catch (e: unknown) {
        setError(
          e instanceof Error
            ? e.message
            : "Failed to delete upload and artifacts.",
        );
      } finally {
        setDeletingUploadId(null);
      }
    },
    [getAccessTokenSilently],
  );

  const closeDeleteDialog = useCallback(() => {
    if (deletingUploadId) return;
    setDeleteDialogUpload(null);
  }, [deletingUploadId]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAnimatePipelineHealth(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
      const status = normalizeUploadStatus(job.status);
      if (status === "SUCCEEDED") counts.succeeded += 1;
      else if (isUploadInProgress(status)) counts.building += 1;
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

  const inProgressJobs = useMemo(
    () =>
      sortedJobs.filter((job) => isUploadInProgress(normalizeUploadStatus(job.status))),
    [sortedJobs],
  );
  const failedJobs = useMemo(
    () => sortedJobs.filter((job) => normalizeUploadStatus(job.status) === "FAILED"),
    [sortedJobs],
  );
  const succeededJobs = useMemo(
    () => sortedJobs.filter((job) => normalizeUploadStatus(job.status) === "SUCCEEDED"),
    [sortedJobs],
  );

  const awsStatusLabel =
    awsConnected === null
      ? "AWS status unavailable"
      : awsConnected
        ? "AWS connected"
        : "AWS not connected";

  const awsStatusClass =
    awsConnected === null
      ? "text-gray-200"
      : awsConnected
        ? "text-green-200"
        : "text-amber-200";

  const dialogIsBusy = dialogStatus === "presigning" || dialogStatus === "uploading";

  const dialogHelperText = useMemo(() => {
    if (!dialogFile) return "Drag and drop Terraform files or Browse.";
    return `${dialogFile.name} • ${prettyBytes(dialogFile.size)}`;
  }, [dialogFile]);

  const trimmedDialogUploadName = dialogUploadName.trim();
  const normalizedDialogUploadName = trimmedDialogUploadName.toLowerCase();
  const isDialogUploadNameBlank = trimmedDialogUploadName.length === 0;
  const isDialogUploadNameTooLong = trimmedDialogUploadName.length > 32;
  const isDialogUploadNameTaken =
    !isDialogUploadNameBlank &&
    jobs.some((job) => job.name.trim().toLowerCase() === normalizedDialogUploadName);
  const isDialogUploadNameInvalid =
    isDialogUploadNameBlank || isDialogUploadNameTooLong || isDialogUploadNameTaken;
  const isDialogUploadNameVisualError =
    (dialogUploadNameInteracted && isDialogUploadNameBlank) ||
    isDialogUploadNameTooLong ||
    isDialogUploadNameTaken;

  const closeNewUploadDialog = useCallback(() => {
    setIsNewUploadDialogOpen(false);
    setDialogUploadName("");
    setDialogUploadNameInteracted(false);
    setDialogFile(null);
    setDialogIsDragging(false);
    setDialogError(null);
    setDialogProgress(0);
    setDialogStatus("idle");
  }, []);

  const openNewUploadDialog = useCallback(() => {
    setIsNewUploadDialogOpen(true);
    setDialogUploadName("");
    setDialogUploadNameInteracted(false);
    setDialogFile(null);
    setDialogIsDragging(false);
    setDialogError(null);
    setDialogProgress(0);
    setDialogStatus("idle");
  }, []);

  const validateAndSetDialogFile = useCallback((next: File) => {
    if (next.size > MAX_BYTES) {
      setDialogError(`File too large. Max is ${prettyBytes(MAX_BYTES)}.`);
      setDialogFile(null);
      return;
    }

    if (!isTerraformLikeFile(next)) {
      setDialogError("Unsupported file type. Use .tf, .tfvars, .zip, .tar, .tgz.");
      setDialogFile(null);
      return;
    }

    setDialogError(null);
    setDialogFile(next);
  }, []);

  const startDialogUpload = useCallback(async () => {
    if (!dialogFile) {
      setDialogError("Please select a file first.");
      return;
    }

    if (isDialogUploadNameBlank) {
      setDialogError("Terraform config name is required.");
      return;
    }

    if (isDialogUploadNameTooLong) {
      setDialogError("Terraform config name must be 32 characters or fewer.");
      return;
    }

    if (isDialogUploadNameTaken) {
      setDialogError("Terraform config name is already in use.");
      return;
    }

    try {
      setDialogError(null);
      setDialogStatus("presigning");
      setDialogProgress(0);

      if (!isAuthenticated) {
        await loginWithRedirect({
          appState: {
            returnTo: "/home",
          },
        });
        return;
      }

      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });

      const contentType =
        getSupportedContentType(dialogFile.name) || "application/octet-stream";

      const presign = await presignTerraformUpload(
        {
          filename: dialogFile.name,
          name: trimmedDialogUploadName,
          contentType,
        },
        accessToken,
      );

      setDialogStatus("uploading");

      await uploadFileToPresignedUrl(
        presign.url,
        dialogFile,
        (p: number) => {
          setDialogProgress(p);
        },
        contentType,
      );

      await completeTerraformUpload(presign.uploadId, accessToken);

      setDialogStatus("done");
      await loadJobs();
      setSuccessUploadName(trimmedDialogUploadName);
      closeNewUploadDialog();
      setIsUploadSuccessDialogOpen(true);
    } catch (e: unknown) {
      setDialogStatus("idle");
      setDialogProgress(0);
      setDialogError(e instanceof Error ? e.message : "Upload failed.");
    }
  }, [
    dialogFile,
    getAccessTokenSilently,
    isDialogUploadNameBlank,
    isDialogUploadNameTooLong,
    isDialogUploadNameTaken,
    isAuthenticated,
    loadJobs,
    loginWithRedirect,
    closeNewUploadDialog,
    trimmedDialogUploadName,
  ]);

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
      <Header title="Home" loggedIn />

      <div className="relative z-10 px-6 sm:px-10 lg:px-14 xl:px-20 pt-12 pb-20">
        <span
          className={`absolute top-6 right-6 sm:right-10 lg:right-14 xl:right-20 inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] tracking-[0.12em] uppercase ${awsStatusClass}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full bg-current ${awsConnected ? "animate-pulse" : ""}`}
          />
          {awsStatusLabel}
        </span>

        <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[11px] font-medium tracking-[0.2em] text-(--text-muted) uppercase">
              Default Environment
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
              Dashboard
            </h2>
            <p className="mt-3 text-sm text-(--text-secondary) max-w-2xl">
              Track upload health, triage failed or in-progress runs, and jump
              directly into the latest analyses.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex items-center gap-2">
              <AppButton
                onClick={openNewUploadDialog}
                variant="outline"
                size="compact"
              >
                New Upload
              </AppButton>
              <AppButton
                onClick={() => void loadJobs()}
                variant="outline"
                size="compact"
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
              </AppButton>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 border border-red-300/30 bg-red-400/10 rounded-none px-5 py-4 text-sm text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="mt-6 border border-(--border) bg-black/25 backdrop-blur-sm rounded-none overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="px-6 py-6 sm:px-8 sm:py-7 border-b xl:border-b-0 xl:border-r border-(--border)">
              <p className="text-[11px] tracking-[0.14em] uppercase text-(--text-muted)">
                Pipeline Health
              </p>
              <div className="mt-4 h-3 w-full rounded-full bg-white/8 overflow-hidden">
                <div className="h-full w-full flex">
                  <div
                    className="bg-green-300/80"
                    style={{
                      width: animatePipelineHealth ? `${completionRatio}%` : "0%",
                      transition: "width 700ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  />
                  <div
                    className="bg-amber-300/80"
                    style={{
                      width: animatePipelineHealth ? `${buildingRatio}%` : "0%",
                      transition: "width 700ms cubic-bezier(0.22, 1, 0.36, 1) 120ms",
                    }}
                  />
                  <div
                    className="bg-red-300/80"
                    style={{
                      width: animatePipelineHealth ? `${failedRatio}%` : "0%",
                      transition: "width 700ms cubic-bezier(0.22, 1, 0.36, 1) 220ms",
                    }}
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

        <section className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="border border-(--border) bg-black/20 backdrop-blur-sm rounded-none overflow-hidden">
            <div className="px-5 py-4 border-b border-(--border)">
              <h3 className="text-base font-semibold">Work Queue</h3>
              <p className="mt-1 text-xs text-(--text-muted)">
                Runs that need attention now.
              </p>
            </div>
            <div className="divide-y divide-(--border)">
              {inProgressJobs.length === 0 && failedJobs.length === 0 ? (
                <div className="px-5 py-8 text-sm text-(--text-muted)">
                  No active or failed runs right now.
                </div>
              ) : (
                [...inProgressJobs.slice(0, 4), ...failedJobs.slice(0, 4)].map((job) => (
                  <div
                    key={`queue-${job.uploadId}`}
                    className="px-5 py-4 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {displayUploadName(job.name)}
                      </p>
                      <p className="mt-1 text-xs text-(--text-secondary) truncate">
                        {job.uploadId}
                      </p>
                      {job.lastError && (
                        <p className="mt-1 text-xs text-red-200 truncate">
                          {job.lastError}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase border rounded-none ${uploadStatusBadgeClass(job.status)}`}
                      >
                        {formatUploadStatusLabel(job.status)}
                      </span>
                      <p className="mt-2 text-[11px] text-(--text-muted)">
                        {formatTimestamp(job.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-(--border) bg-black/20 backdrop-blur-sm rounded-none overflow-hidden">
            <div className="px-5 py-4 border-b border-(--border)">
              <h3 className="text-base font-semibold">Latest Successful Analyses</h3>
              <p className="mt-1 text-xs text-(--text-muted)">
                Recent runs that are ready for deep-dive review.
              </p>
            </div>
            <div className="divide-y divide-(--border)">
              {succeededJobs.length === 0 ? (
                <div className="px-5 py-8 text-sm text-(--text-muted)">
                  No successful uploads yet.
                </div>
              ) : (
                succeededJobs.slice(0, 5).map((job) => (
                  <div
                    key={`success-${job.uploadId}`}
                    className="px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {displayUploadName(job.name)}
                      </p>
                      <p className="mt-1 text-xs text-(--text-secondary) truncate">
                        {job.uploadId}
                      </p>
                      <p className="mt-1 text-xs text-(--text-secondary) truncate">
                        Updated {formatTimestamp(job.updatedAt)}
                      </p>
                    </div>
                    <Link
                      to={`/home/uploads/${job.uploadId}`}
                      className="inline-flex items-center px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase border border-(--input-focus) text-(--text-primary) hover:border-white/40 shrink-0"
                    >
                      Open
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {!isLoading && !error && sortedJobs.length === 0 && (
          <div className="mt-6 border border-(--border) bg-white/2 rounded-none px-6 py-14 text-center">
            <p className="text-sm tracking-[0.12em] uppercase text-(--text-muted)">
              No upload jobs found
            </p>
            <p className="mt-2 text-sm text-(--text-secondary)">
              Start an import to create your first Terraform upload record.
            </p>
          </div>
        )}

        {sortedJobs.length > 0 && (
          <section className="mt-6 border border-(--border) bg-black/20 backdrop-blur-sm rounded-none overflow-hidden">
            <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-6 py-3 border-b border-(--border) text-[11px] tracking-[0.12em] uppercase text-(--text-muted)">
              <span className="col-span-4">Upload</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-4">Artifacts</span>
              <span className="col-span-2 text-right">Updated</span>
            </div>

            {sortedJobs.map((job) => {
              const isSucceeded =
                normalizeUploadStatus(job.status) === "SUCCEEDED";
              const hasArtifacts = isSucceeded;

              return (
                <article
                  key={job.uploadId}
                  className="px-5 lg:px-6 py-4 border-b border-(--border) last:border-b-0"
                >
                  <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center">
                    <div className="col-span-4 text-sm font-medium break-all">
                      <span className="block">{displayUploadName(job.name)}</span>
                      <span className="mt-1 block text-xs font-normal text-(--text-secondary)">
                        {job.uploadId}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span
                        className={`inline-flex px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase border rounded-none ${uploadStatusBadgeClass(job.status)}`}
                      >
                        {formatUploadStatusLabel(job.status)}
                      </span>
                    </div>

                    <div className="col-span-4 text-sm text-(--text-secondary)">
                      {hasArtifacts ? "Plan / Graph" : "Pending"}
                    </div>

                    <div className="col-span-2 text-sm text-(--text-secondary) text-right">
                      {formatTimestamp(job.updatedAt)}
                    </div>
                  </div>

                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-all">
                          {displayUploadName(job.name)}
                        </p>
                        <p className="text-xs text-(--text-secondary) break-all">
                          {job.uploadId}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase border rounded-none ${uploadStatusBadgeClass(job.status)}`}
                      >
                        {formatUploadStatusLabel(job.status)}
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

                  </div>

                  {job.lastError && (
                    <div className="mt-3 text-xs text-red-200 border border-red-300/30 bg-red-400/10 rounded-none px-3 py-2 break-all">
                      Last error: {job.lastError}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-end gap-2">
                    {isSucceeded && (
                      <Link
                        to={`/home/uploads/${job.uploadId}`}
                        className="inline-flex items-center px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase border border-(--input-focus) text-(--text-primary) hover:border-white/40"
                      >
                        Open Dashboard
                      </Link>
                    )}
                    <AppButton
                      onClick={() => setDeleteDialogUpload(job)}
                      disabled={deletingUploadId === job.uploadId}
                      variant="danger"
                      size="chip"
                    >
                      {deletingUploadId === job.uploadId
                        ? "Deleting..."
                        : "Delete"}
                    </AppButton>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {!error && isLoading && (
          <div className="mt-6 border border-(--border) bg-white/2 rounded-none px-6 py-10 text-center text-(--text-secondary)">
            <div className="inline-flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading upload jobs...
            </div>
          </div>
        )}

      </div>

      {isNewUploadDialogOpen && (
        <div
          className="dashboard-expand-backdrop fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
          onClick={closeNewUploadDialog}
        >
          <div
            className="dashboard-expand-panel w-full max-w-2xl border border-(--border) bg-(--header-bg) p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">New Upload</h3>
            <p className="mt-2 text-sm text-(--text-secondary)">
              Upload Terraform files to create a new analysis run.
            </p>

            <div className="mt-6">
              <label
                htmlFor="dashboard-upload-name"
                className="block text-[11px] font-medium tracking-[0.12em] uppercase text-(--text-muted) mb-2"
              >
                Terraform Config Name
              </label>
              <input
                id="dashboard-upload-name"
                type="text"
                value={dialogUploadName}
                disabled={dialogIsBusy}
                onChange={(e) => {
                  setDialogUploadNameInteracted(true);
                  setDialogUploadName(e.target.value);
                }}
                className={`w-full border bg-white/2 px-4 py-3 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none disabled:opacity-60 ${isDialogUploadNameVisualError
                  ? "border-red-400/90 focus:border-red-400"
                  : "border-(--border) focus:border-(--input-focus)"
                  }`}
                placeholder="default"
              />
              {dialogUploadNameInteracted && isDialogUploadNameBlank && (
                <p className="mt-2 text-xs text-red-300">
                  Name is required.
                </p>
              )}
              {isDialogUploadNameTooLong && (
                <p className="mt-2 text-xs text-red-300">
                  Name must be 32 characters or fewer.
                </p>
              )}
              {isDialogUploadNameTaken && (
                <p className="mt-2 text-xs text-red-300">
                  This config name is already in use.
                </p>
              )}
            </div>

            <div
              className={`mt-5 border-2 border-dashed ${dialogIsDragging ? "border-white/40" : "border-white/20"
                } bg-white/2 min-h-[260px] flex items-center justify-center text-center px-6`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dialogIsBusy) return;
                setDialogIsDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dialogIsBusy) return;
                setDialogIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDialogIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDialogIsDragging(false);
                if (dialogIsBusy) return;
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) validateAndSetDialogFile(dropped);
              }}
            >
              <div className="w-full">
                <div className="mx-auto w-14 h-14 border border-(--border) bg-white/3 flex items-center justify-center mb-5">
                  <span className="text-2xl">
                    <CloudUpload />
                  </span>
                </div>

                <p className="text-lg font-light text-(--text-primary) mb-2">
                  {dialogHelperText}
                </p>

                <p className="text-xs text-(--text-secondary)">
                  Max file size: {prettyBytes(MAX_BYTES)}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
                  <AppButton
                    disabled={dialogIsBusy}
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                  >
                    Browse
                  </AppButton>
                  <AppButton
                    disabled={
                      dialogIsBusy || !dialogFile || isDialogUploadNameInvalid
                    }
                    onClick={() => void startDialogUpload()}
                    variant="primary"
                  >
                    {dialogStatus === "presigning"
                      ? "Preparing..."
                      : dialogStatus === "uploading"
                        ? `Uploading ${dialogProgress}%`
                        : dialogStatus === "done"
                          ? "Uploaded"
                          : "Upload"}
                  </AppButton>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".tf,.tfvars,.zip,.tar,.tgz,.tar.gz"
                  className="hidden"
                  onChange={(e) => {
                    const picked = e.target.files?.[0];
                    if (picked) validateAndSetDialogFile(picked);
                  }}
                />
              </div>
            </div>

            {dialogError && (
              <p className="mt-4 text-sm text-red-300">{dialogError}</p>
            )}

            <div className="mt-6 flex justify-end">
              <AppButton
                onClick={closeNewUploadDialog}
                variant="outline"
                size="field"
              >
                Close
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {isUploadSuccessDialogOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4"
          onClick={() => setIsUploadSuccessDialogOpen(false)}
        >
          <div
            className="w-full max-w-md border border-(--border) bg-(--header-bg) p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Upload Succeeded</h3>
            <p className="mt-2 text-sm text-(--text-secondary)">
              Terraform config <span className="font-semibold">{successUploadName}</span> uploaded successfully.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <AppButton
                onClick={() => setIsUploadSuccessDialogOpen(false)}
                variant="outline"
                size="field"
              >
                Close
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {deleteDialogUpload && (
        <div
          className="dashboard-expand-backdrop fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4"
          onClick={closeDeleteDialog}
        >
          <div
            className="dashboard-expand-panel w-full max-w-md border border-(--border) bg-(--header-bg) p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Delete Upload</h3>
            <p className="mt-2 text-sm text-(--text-secondary)">
              Delete Terraform config{" "}
              <span className="font-semibold">
                {displayUploadName(deleteDialogUpload.name)}
              </span>{" "}
              and all of its S3 artifacts?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <AppButton
                onClick={closeDeleteDialog}
                variant="outline"
                size="field"
                disabled={deletingUploadId === deleteDialogUpload.uploadId}
              >
                Cancel
              </AppButton>
              <AppButton
                onClick={() => void handleDeleteUpload(deleteDialogUpload.uploadId)}
                variant="danger"
                size="field"
                disabled={deletingUploadId === deleteDialogUpload.uploadId}
              >
                {deletingUploadId === deleteDialogUpload.uploadId
                  ? "Deleting..."
                  : "Delete"}
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
