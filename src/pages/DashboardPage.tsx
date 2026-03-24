import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import DashboardGraph from "../components/graph/DashboardGraph";
import { getCurrentUser, getUploads, type UploadJob } from "../api/uploads";
import graphData from "../data/strideGraph.json";

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

export default function DashboardPage() {
  const { user, getAccessTokenSilently } = useAuth0();
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        });

        const [currentUser, uploadJobs] = await Promise.all([
          getCurrentUser(accessToken).catch(() => null),
          getUploads(accessToken).catch(() => []),
        ]);

        const userId = currentUser?.id ?? currentUser?.userId ?? user?.sub;
        if (!userId) {
          setJobs(uploadJobs);
          return;
        }

        setJobs(uploadJobs.filter((job) => job.userId === userId));
      } catch {
        setJobs([]);
      }
    };

    void load();
  }, [getAccessTokenSilently, user?.sub]);

  const displayName = (() => {
    if (user?.given_name?.trim()) return user.given_name.trim();
    if (user?.name?.trim()) return user.name.trim();
    if (user?.email?.trim()) return user.email.trim();
    return "user";
  })();

  const vulnerableJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = job.status.trim().toUpperCase();
        return (
          status === "VULNERABLE" ||
          status === "HAS_VULNERABILITIES" ||
          status === "VULNERABILITIES_FOUND"
        );
      }),
    [jobs],
  );
  const totalJobs = jobs.length;
  const healthyJobs = Math.max(totalJobs - vulnerableJobs.length, 0);
  const riskScore =
    graphData.metadata?.overallRiskScore !== undefined &&
    graphData.metadata?.overallRiskScore !== null
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
          <div className="border border-(--border) bg-black/20 backdrop-blur-sm rounded-2xl p-6 sm:p-8">
            <p className="text-xs tracking-[0.18em] uppercase text-(--text-muted)">
              AppLens Overview
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight">
              Good morning, <span className="opacity-90">{displayName}</span>.
            </h2>
            <p className="mt-3 text-sm text-(--text-secondary) font-light max-w-3xl">
              There {vulnerableJobs.length !== 1 ? "are" : "is"} currently{" "}
              <span className="font-bold">
                {vulnerableJobs.length}{" "}
                {vulnerableJobs.length !== 1
                  ? "vulnerabilities"
                  : "vulnerability"}{" "}
              </span>
              requiring attention across your latest ingestion jobs.
            </p>
          </div>
          <div className="border border-(--border) bg-black/20 backdrop-blur-sm rounded-2xl p-6 sm:p-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.18em] uppercase text-(--text-muted)">
                Next Step
              </p>
              <p className="mt-2 text-lg font-medium">Inspect live inventory</p>
              <p className="mt-2 text-sm text-(--text-secondary) font-light">
                Review graph relationships and prioritize nodes with active
                findings.
              </p>
            </div>
            <button className="shrink-0 px-6 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100">
              Live inventory/SBOM
            </button>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-(--border) bg-white/3 rounded-xl px-5 py-4">
            <div className="text-xs tracking-[0.14em] uppercase text-(--text-muted)">
              Overall Risk
            </div>
            <div
              className="mt-2 text-2xl font-semibold"
              style={{ color: hasNumericRiskScore ? riskColor : undefined }}
            >
              {riskScore}
            </div>
          </div>
          <div className="border border-(--border) bg-white/3 rounded-xl px-5 py-4">
            <div className="text-xs tracking-[0.14em] uppercase text-(--text-muted)">
              Vulnerable Jobs
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {vulnerableJobs.length}
            </div>
          </div>
          <div className="border border-(--border) bg-white/3 rounded-xl px-5 py-4">
            <div className="text-xs tracking-[0.14em] uppercase text-(--text-muted)">
              Healthy Jobs
            </div>
            <div className="mt-2 text-2xl font-semibold">{healthyJobs}</div>
          </div>
          <div className="border border-(--border) bg-white/3 rounded-xl px-5 py-4">
            <div className="text-xs tracking-[0.14em] uppercase text-(--text-muted)">
              Total Jobs
            </div>
            <div className="mt-2 text-2xl font-semibold">{totalJobs}</div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
          <aside className="space-y-6">
            <div className="border border-(--border) bg-black/25 backdrop-blur-sm rounded-2xl p-6 flex flex-col items-center">
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

            <div className="border border-(--border) bg-black/25 backdrop-blur-sm rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-(--border)">
                <h3 className="text-base font-semibold">
                  Active Vulnerabilities
                </h3>
              </div>
              {vulnerableJobs.length === 0 ? (
                <div className="px-5 py-4 text-(--text-secondary) font-light">
                  None detected
                </div>
              ) : (
                vulnerableJobs.map((job, idx) => (
                  <div
                    key={job.uploadId}
                    className="px-5 py-4 border-b border-(--border) last:border-b-0 flex items-center justify-between gap-3"
                  >
                    <span className="font-light truncate">
                      {idx + 1}. {job.uploadId}
                    </span>
                    <span className="opacity-70 shrink-0">Open</span>
                  </div>
                ))
              )}
            </div>
          </aside>

          <div className="space-y-6">
            <div className="border border-(--border) bg-black/25 backdrop-blur-sm rounded-2xl p-4 sm:p-5">
              <div className="mb-3 px-2">
                <h3 className="text-base font-semibold">
                  Live Service Inventory
                </h3>
                <p className="text-xs text-(--text-muted) mt-1">
                  Relationship map of currently tracked components and findings.
                </p>
              </div>
              <DashboardGraph />
            </div>

            <div className="border border-(--border) bg-black/25 backdrop-blur-sm rounded-2xl overflow-hidden">
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
                      className={`inline-flex px-2.5 py-1 text-[11px] tracking-[0.12em] uppercase border rounded-sm shrink-0 ${statusBadgeClass(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
