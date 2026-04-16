import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import DashboardGraph from "../components/graph/DashboardGraph";
import {
  fetchPresignedJson,
  deleteUpload,
  getCurrentUser,
  getUpload,
  getUploadArtifacts,
  getUploadGraph,
  getUploads,
  presignUploadArtifact,
  type UploadJob,
} from "../api/uploads";
import {
  mergeGraphWithStride,
  type DashboardGraphData,
  type DashboardGraphEdge,
  type DashboardGraphNode,
  type StrideArtifact,
} from "../types/dashboardArtifacts";
import {
  formatUploadStatusLabel,
  normalizeUploadStatus,
  uploadStatusBadgeClass,
} from "../types/uploadStatus";

type ThreatLike = {
  title?: string;
};

function isDashboardGraphData(value: unknown): value is DashboardGraphData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { nodes?: unknown; edges?: unknown };
  return Array.isArray(candidate.nodes) && Array.isArray(candidate.edges);
}

function ensureDashboardGraphData(value: unknown): DashboardGraphData {
  if (!isDashboardGraphData(value)) {
    throw new Error("Invalid graph artifact payload.");
  }

  return value;
}

function listThreatItems(graphData: DashboardGraphData) {
  const nodeThreats = (graphData.nodes ?? []).flatMap((node: DashboardGraphNode) =>
    (node.threats ?? node.data?.threats ?? []).map((threat: ThreatLike) => ({
      key: `${node.id}-${threat.title ?? "threat"}`,
      title: threat.title ?? "Untitled threat",
      source: node.data?.shortType ?? node.data?.label ?? node.id,
    })),
  );

  const boundaryThreats = (graphData.edges ?? []).flatMap(
    (edge: DashboardGraphEdge) =>
      (edge.data?.boundaryThreats ?? []).map((threat: ThreatLike) => ({
        key: `${edge.id}-${threat.title ?? "boundary-threat"}`,
        title: threat.title ?? "Untitled boundary threat",
        source: `${edge.source} -> ${edge.target}`,
      })),
  );

  return [...nodeThreats, ...boundaryThreats];
}

export default function DashboardPage() {
  const { user, getAccessTokenSilently } = useAuth0();
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [graphData, setGraphData] = useState<DashboardGraphData | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadId) {
      setLoadError("Missing upload id.");
      setIsLoading(false);
      return;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });

        const [currentUser, uploadJobs, upload] = await Promise.all([
          getCurrentUser(accessToken).catch(() => null),
          getUploads(accessToken).catch(() => []),
          getUpload(uploadId, accessToken),
        ]);

        const userId = currentUser?.id ?? currentUser?.userId ?? user?.sub;
        const visibleJobs = userId
          ? uploadJobs.filter((job) => job.userId === userId)
          : uploadJobs;
        setJobs(visibleJobs);

        const normalizedStatus = normalizeUploadStatus(upload.status);
        setUploadStatus(normalizedStatus);

        if (normalizedStatus !== "SUCCEEDED") {
          setGraphData(null);
          return;
        }

        const artifacts = await getUploadArtifacts(uploadId, accessToken);
        if (!artifacts.graphReady) {
          throw new Error("Graph artifact is not ready yet.");
        }

        const baseGraphRaw = await getUploadGraph(uploadId, accessToken, "condensed");
        const baseGraph = ensureDashboardGraphData(baseGraphRaw);

        let strideArtifact: StrideArtifact | null = null;
        const strideAvailable = artifacts.artifacts.some(
          (artifact) => artifact.name === "stride" && artifact.exists,
        );

        if (strideAvailable) {
          try {
            const stridePresign = await presignUploadArtifact(
              uploadId,
              "stride",
              accessToken,
            );
            strideArtifact = await fetchPresignedJson<StrideArtifact>(stridePresign.url);
          } catch {
            strideArtifact = null;
          }
        }

        setGraphData(mergeGraphWithStride(baseGraph, strideArtifact));
      } catch (error: unknown) {
        setGraphData(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data for this upload.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [getAccessTokenSilently, uploadId, user?.sub]);

  const displayName = (() => {
    if (user?.given_name?.trim()) return user.given_name.trim();
    if (user?.name?.trim()) return user.name.trim();
    if (user?.email?.trim()) return user.email.trim();
    return "user";
  })();

  const threatItems = useMemo(
    () => (graphData ? listThreatItems(graphData) : []),
    [graphData],
  );

  const vulnerabilityCount = threatItems.length;
  const totalJobs = jobs.length;
  const riskScore =
    graphData?.metadata?.overallRiskScore !== undefined &&
    graphData?.metadata?.overallRiskScore !== null
      ? String(graphData.metadata.overallRiskScore)
      : "N/A";

  const numericRiskScore = Number.parseFloat(riskScore);
  const hasNumericRiskScore = Number.isFinite(numericRiskScore);
  const normalizedRiskScore = hasNumericRiskScore
    ? Math.min(100, Math.max(0, numericRiskScore))
    : 0;
  const progress = normalizedRiskScore / 100;
  const ringRadius = 96;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progress);
  const riskColor = `hsl(${(1 - progress) * 120} 80% 50%)`;
  const recentJobs = useMemo(() => jobs.slice(0, 4), [jobs]);

  const showBlockedState =
    !isLoading &&
    !loadError &&
    uploadStatus !== null &&
    normalizeUploadStatus(uploadStatus) !== "SUCCEEDED";

  const graphReady = !isLoading && !loadError && !showBlockedState && !!graphData;

  const handleDeleteUpload = async () => {
    if (!uploadId) return;

    const confirmed = window.confirm(
      "Delete this upload and all of its S3 artifacts?",
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);

      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });

      await deleteUpload(uploadId, accessToken);
      navigate("/home", { replace: true });
    } catch (error: unknown) {
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete upload.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary) relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(50rem 26rem at 12% -4%, rgba(56, 189, 248, 0.11), transparent 64%), radial-gradient(42rem 24rem at 92% 12%, rgba(244, 63, 94, 0.09), transparent 67%), radial-gradient(54rem 32rem at 52% 100%, rgba(250, 204, 21, 0.06), transparent 68%)",
        }}
      />
      <div
        aria-hidden="true"
        className="dashboard-grid-bg pointer-events-none absolute inset-0 z-0 opacity-45"
      />
      <Header loggedIn />

      <div className="relative z-10 px-6 sm:px-10 lg:px-14 xl:px-20 pt-12 pb-20">
        <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch">
          <div className="pt-4 sm:pt-5 px-1 sm:px-2">
            <p className="text-xs tracking-[0.18em] uppercase text-(--text-muted)">
              AppLens Overview
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight">
              Good morning, <span className="opacity-90">{displayName}</span>.
            </h2>
            <p className="mt-3 text-sm text-(--text-secondary) font-light max-w-3xl">
              Upload <span className="font-semibold">{uploadId}</span> currently has{" "}
              <span className="font-bold">
                {vulnerabilityCount} {vulnerabilityCount !== 1 ? "vulnerabilities" : "vulnerability"}
              </span>{" "}
              identified in the architecture analysis.
            </p>
          </div>
          <div className="border border-(--border) bg-black/20 backdrop-blur-sm rounded-none p-6 sm:p-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.18em] uppercase text-(--text-muted)">
                Upload Status
              </p>
              <p className="mt-2 text-lg font-medium">Analysis snapshot</p>
              <p className="mt-2 text-sm text-(--text-secondary) font-light">
                Graph and STRIDE findings for this specific upload run.
              </p>
            </div>
            <span
              className={`shrink-0 inline-flex px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase border rounded-sm ${uploadStatusBadgeClass(uploadStatus ?? "UNKNOWN")}`}
            >
              {formatUploadStatusLabel(uploadStatus ?? "UNKNOWN")}
            </span>
          </div>
        </section>

        {loadError && (
          <section className="mt-6 border border-red-300/30 bg-red-400/10 rounded-none px-5 py-4 text-sm text-red-100">
            {loadError}
          </section>
        )}

        {deleteError && (
          <section className="mt-6 border border-red-300/30 bg-red-400/10 rounded-none px-5 py-4 text-sm text-red-100">
            {deleteError}
          </section>
        )}

        {showBlockedState && (
          <section className="mt-6 border border-amber-300/30 bg-amber-400/10 rounded-none px-5 py-4 text-sm text-amber-100">
            This dashboard is only available after the upload run succeeds.
          </section>
        )}

        {!graphReady && !loadError && !showBlockedState && (
          <section className="mt-6 border border-(--border) bg-black/25 backdrop-blur-sm rounded-none px-5 py-8 text-sm text-(--text-secondary)">
            Loading upload dashboard artifacts...
          </section>
        )}

        {graphReady && graphData && (
          <>
            <section className="mt-6 border border-(--border) bg-black/25 backdrop-blur-sm rounded-none overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div className="px-6 py-6 sm:px-7 border-b sm:border-b-0 sm:border-r border-(--border)">
                  <div className="text-[11px] tracking-[0.14em] uppercase text-(--text-muted)">
                    Overall Risk
                  </div>
                  <div
                    className="mt-2 text-2xl font-semibold"
                    style={{ color: hasNumericRiskScore ? riskColor : undefined }}
                  >
                    {riskScore}
                  </div>
                </div>
                <div className="px-6 py-6 sm:px-7 border-b lg:border-b-0 lg:border-r border-(--border)">
                  <div className="text-[11px] tracking-[0.14em] uppercase text-(--text-muted)">
                    Vulnerabilities
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {vulnerabilityCount}
                  </div>
                </div>
                <div className="px-6 py-6 sm:px-7">
                  <div className="text-[11px] tracking-[0.14em] uppercase text-(--text-muted)">
                    Total Jobs
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{totalJobs}</div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
              <aside className="space-y-6">
                <div className="border border-(--border) bg-black/25 backdrop-blur-sm rounded-none p-6 flex flex-col items-center">
                  <div className="w-72 h-72 rounded-full border border-(--border) flex items-center justify-center bg-white/2 relative">
                    <svg
                      className="absolute w-56 h-56 -rotate-90"
                      viewBox="0 0 240 240"
                      aria-hidden="true"
                    >
                      <circle
                        cx="120"
                        cy="120"
                        r={ringRadius}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.15)"
                        strokeWidth="14"
                      />
                      <circle
                        cx="120"
                        cy="120"
                        r={ringRadius}
                        fill="none"
                        stroke={
                          hasNumericRiskScore
                            ? riskColor
                            : "rgba(255, 255, 255, 0.35)"
                        }
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringOffset}
                        style={{
                          transition:
                            "stroke-dashoffset 400ms ease, stroke 300ms ease",
                        }}
                      />
                    </svg>

                    <div className="w-52 h-52 rounded-full border border-white/12 flex items-center justify-center bg-black/10">
                      <div className="text-center">
                        <div className="text-xs text-(--text-muted) tracking-[0.2em] uppercase mb-1">
                          Risk Score
                        </div>
                        <div
                          className="text-5xl font-semibold"
                          style={{
                            color: hasNumericRiskScore ? riskColor : undefined,
                          }}
                        >
                          {riskScore}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-(--border) bg-black/25 backdrop-blur-sm rounded-none overflow-hidden">
                  <div className="px-5 py-4 border-b border-(--border)">
                    <h3 className="text-base font-semibold">
                      Active Vulnerabilities
                    </h3>
                  </div>
                  {threatItems.length === 0 ? (
                    <div className="px-5 py-4 text-(--text-secondary) font-light">
                      None detected
                    </div>
                  ) : (
                    threatItems.slice(0, 8).map((threat, idx) => (
                      <div
                        key={`${threat.key}-${idx}`}
                        className="px-5 py-4 border-b border-(--border) last:border-b-0 flex items-center justify-between gap-3"
                      >
                        <span className="font-light truncate">
                          {idx + 1}. {threat.title}
                        </span>
                        <span className="opacity-70 shrink-0 text-xs truncate max-w-[120px]">
                          {threat.source}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </aside>

              <div className="space-y-6">
                <div className="border border-(--border) bg-black/25 backdrop-blur-sm rounded-none p-4 sm:p-5">
                  <div className="mb-3 px-2">
                    <h3 className="text-base font-semibold">
                      Live Service Inventory
                    </h3>
                    <p className="text-xs text-(--text-muted) mt-1">
                      Relationship map of currently tracked components and findings.
                    </p>
                  </div>
                  <DashboardGraph key={uploadId} graphData={graphData} />
                </div>

                <div className="border border-(--border) bg-black/25 backdrop-blur-sm rounded-none overflow-hidden">
                  <div className="px-5 py-4 border-b border-(--border)">
                    <h3 className="text-base font-semibold">
                      Recent Upload Activity
                    </h3>
                  </div>
                  {recentJobs.length === 0 ? (
                    <div className="px-5 py-8 text-(--text-muted) text-sm">
                      No upload activity yet.
                    </div>
                  ) : (
                    recentJobs.map((job) => (
                      <div
                        key={job.uploadId}
                        className="px-5 py-4 border-b border-(--border) last:border-b-0 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {job.uploadId}
                          </p>
                          <p className="text-xs text-(--text-muted) mt-1">
                            User: {job.userId}
                          </p>
                        </div>
                        <span
                          className={`inline-flex px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase border rounded-sm shrink-0 ${uploadStatusBadgeClass(job.status)}`}
                        >
                          {formatUploadStatusLabel(job.status)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/home"
              className="inline-flex items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.12em] border border-(--input-focus) hover:border-white/40"
            >
              Back to Home
            </Link>
            <button
              type="button"
              onClick={() => void handleDeleteUpload()}
              disabled={isDeleting}
              className="inline-flex items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.12em] border border-red-300/40 text-red-100 hover:border-red-200/70 disabled:opacity-50"
            >
              {isDeleting ? "Deleting Upload..." : "Delete Upload"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
