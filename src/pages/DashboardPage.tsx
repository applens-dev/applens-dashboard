import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import DashboardGraph from "../components/graph/DashboardGraph";
import { getCurrentUser, getUploads, type UploadJob } from "../api/uploads";
import graphData from "../data/strideGraph.json";

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
  const riskScore =
    graphData.metadata?.overallRiskScore !== undefined &&
    graphData.metadata?.overallRiskScore !== null
      ? String(graphData.metadata.overallRiskScore)
      : "N/A";

  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary)">
      <Header loggedIn />

      <div className="px-10 sm:px-16 lg:px-20 pt-16 pb-20">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1">
            <h2 className="text-4xl sm:text-5xl font-semibold mb-2">
              Good morning, <span className="opacity-90">{displayName}</span>.
            </h2>
            <p className="text-sm text-(--text-secondary) font-light mb-10">
              There {vulnerableJobs.length > 1 ? "are" : "is"} currently{" "}
              {vulnerableJobs.length}{" "}
              {vulnerableJobs.length > 1 ? "vulnerabilities" : "vulnerability"}{" "}
              you should take a look at.
            </p>

            <div className="w-72 h-72 rounded-full border border-(--border) flex items-center justify-center bg-white/2">
              <div className="w-52 h-52 rounded-full border-4 border-white/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs text-(--text-muted) tracking-[0.2em] uppercase mb-1">
                    Risk Score
                  </div>
                  <div className="text-5xl font-semibold">{riskScore}</div>
                </div>
              </div>
            </div>

            <h3 className="mt-12 text-xl font-semibold">
              Active vulnerabilities
            </h3>
            <div className="mt-4 border border-(--border) bg-white/2 rounded-xl overflow-hidden">
              {vulnerableJobs.length === 0 ? (
                <div className="px-5 py-4 border-b border-(--border) flex items-center justify-between">
                  <span className="font-light">None detected</span>
                </div>
              ) : (
                vulnerableJobs.map((job, idx) => (
                  <div
                    key={job.uploadId}
                    className="px-5 py-4 border-b border-(--border) flex items-center justify-between"
                  >
                    <span className="font-light">
                      {idx + 1}. {job.uploadId}
                    </span>
                    <span className="opacity-70">→</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex justify-end mb-4">
              <button className="px-6 py-2 border border-(--input-focus) text-(--text-primary) text-xs font-medium tracking-[0.12em] uppercase hover:border-white/40 opacity-90 hover:opacity-100">
                Live inventory/SBOM
              </button>
            </div>

            <DashboardGraph />

            <div className="mt-6 border border-(--border) bg-white/2 rounded-xl min-h-[140px] flex items-center justify-center text-(--text-muted)">
              Timeline placeholder
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
