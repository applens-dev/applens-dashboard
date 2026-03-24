import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import graphData from "../data/strideGraph.json";

type Threat = {
  category?: string;
  title?: string;
  severity?: string;
};

type ResourceNode = {
  id: string;
  data?: {
    label?: string;
    resourceType?: string;
    shortType?: string;
    provider?: string;
    threatSurface?: string;
    attributes?: Record<string, unknown>;
    threats?: Threat[];
  };
};

const severityRank: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const strideDescriptions: Record<string, string> = {
  spoofing: "Impersonating users, services, or identities to gain unauthorized access.",
  tampering: "Modifying code, data, or configuration in transit or at rest.",
  repudiation: "Denying actions due to missing or insufficient audit evidence.",
  informationdisclosure:
    "Exposing sensitive data to unauthorized users or systems.",
  denialofservice:
    "Degrading or blocking service availability through resource exhaustion.",
  elevationofprivilege:
    "Gaining capabilities beyond intended permissions or role boundaries.",
};

function severityClass(severity: string): string {
  const key = severity.toLowerCase();
  if (key === "critical") return "text-red-100 border-red-300/40 bg-red-500/20";
  if (key === "high")
    return "text-orange-100 border-orange-300/40 bg-orange-500/20";
  if (key === "medium")
    return "text-amber-100 border-amber-300/40 bg-amber-500/20";
  return "text-slate-200 border-white/20 bg-white/10";
}

function getTopSeverity(threats: Threat[]): string {
  const top = threats.reduce(
    (best, threat) => {
      const normalized = String(threat.severity ?? "low").toLowerCase();
      const score = severityRank[normalized] ?? 1;
      return score > best.score
        ? { label: normalized[0].toUpperCase() + normalized.slice(1), score }
        : best;
    },
    { label: "Low", score: 1 },
  );
  return top.label;
}

function readableValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

export default function InventoryPage() {
  const [query, setQuery] = useState("");
  const nodes = (graphData.nodes as ResourceNode[]).filter(
    (node) => node.data?.resourceType,
  );
  const edges = graphData.edges ?? [];
  const riskScore = graphData.metadata?.overallRiskScore ?? "N/A";

  const resourceRows = nodes
    .map((node) => {
      const threats = node.data?.threats ?? [];
      const strideFlags = graphData.nodes.find((n) => n.id === node.id)?.data
        ?.strideFlags as Record<string, boolean> | undefined;
      const strideKeys = strideFlags
        ? Object.entries(strideFlags)
            .filter(([, enabled]) => enabled)
            .map(([name]) => name)
        : [];

      return {
        id: node.id,
        label: node.data?.label ?? node.id,
        shortType: node.data?.shortType ?? "Unknown",
        provider: node.data?.provider ?? "Unknown",
        threatSurface: node.data?.threatSurface ?? "Unknown",
        threatCount: threats.length,
        topSeverity: threats.length > 0 ? getTopSeverity(threats) : "None",
        strideKeys,
        attributes: node.data?.attributes ?? {},
      };
    })
    .sort((a, b) => {
      const severityDelta =
        (severityRank[b.topSeverity.toLowerCase()] ?? 0) -
        (severityRank[a.topSeverity.toLowerCase()] ?? 0);
      if (severityDelta !== 0) return severityDelta;
      return b.threatCount - a.threatCount;
    });

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return resourceRows;

    return resourceRows.filter((resource) => {
      const attrText = Object.entries(resource.attributes)
        .map(([key, value]) => `${key} ${readableValue(value)}`)
        .join(" ")
        .toLowerCase();
      const strideText = resource.strideKeys.join(" ").toLowerCase();
      const haystack = [
        resource.id,
        resource.label,
        resource.shortType,
        resource.provider,
        resource.threatSurface,
        resource.topSeverity,
        attrText,
        strideText,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, resourceRows]);

  const totalThreats = resourceRows.reduce(
    (sum, row) => sum + row.threatCount,
    0,
  );
  const exposedResources = resourceRows.filter(
    (row) => row.threatSurface === "public",
  ).length;
  const highestSeverityResource = resourceRows.find(
    (row) => row.topSeverity !== "None",
  );

  return (
    <div className="min-h-screen bg-(--page-bg) text-(--text-primary) relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(62rem 30rem at 10% -8%, rgba(14, 165, 233, 0.1), transparent 62%), radial-gradient(40rem 24rem at 92% 8%, rgba(249, 115, 22, 0.11), transparent 66%), radial-gradient(54rem 30rem at 54% 100%, rgba(16, 185, 129, 0.08), transparent 70%)",
        }}
      />
      <Header loggedIn />

      <main className="relative z-10 px-6 sm:px-10 lg:px-14 xl:px-20 pt-12 pb-20">
        <section className="p-1 sm:p-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs tracking-[0.18em] uppercase text-(--text-muted)">
                Inventory / SBOM
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold">
                Live Resource Inventory
              </h1>
              <p className="mt-3 text-sm text-(--text-secondary) max-w-3xl">
                Resource-level view of your analyzed stack, including ownership
                surface, STRIDE exposure, and active findings.
              </p>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 text-xs uppercase tracking-[0.12em] border border-(--input-focus) hover:border-white/40"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>

        <section className="mt-6 border border-(--border) bg-black/20 backdrop-blur-sm rounded-2xl p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
            <div>
              <p className="text-xs tracking-[0.16em] uppercase text-(--text-muted)">
                Snapshot
              </p>
              <p className="mt-2 text-sm sm:text-base text-(--text-secondary)">
                {resourceRows.length} resources and {edges.length} dependencies
                analyzed. {totalThreats} findings across the current graph,
                with {exposedResources} externally exposed resources.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="text-[11px] uppercase tracking-[0.12em] border border-white/15 bg-white/8 px-2.5 py-1.5">
                Risk {riskScore}
              </span>
              {highestSeverityResource ? (
                <span
                  className={`text-[11px] uppercase tracking-[0.12em] border px-2.5 py-1.5 ${severityClass(highestSeverityResource.topSeverity.toLowerCase())}`}
                >
                  Top Risk: {highestSeverityResource.shortType}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-4 border border-(--border) bg-black/20 backdrop-blur-sm rounded-2xl p-4 sm:p-5">
          <label
            htmlFor="inventory-search"
            className="block text-xs tracking-[0.14em] uppercase text-(--text-muted)"
          >
            Search Inventory
          </label>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              id="inventory-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by resource, provider, attributes, threat surface, STRIDE flags..."
              className="w-full rounded-lg border border-(--border) bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-white/35"
            />
            {query.trim() ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 px-4 py-2.5 text-xs uppercase tracking-[0.12em] border border-(--input-focus) hover:border-white/40"
              >
                Clear
              </button>
            ) : null}
          </div>
        </section>

        <section className="mt-6 border border-(--border) bg-black/25 backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-(--border)">
            <h2 className="text-base font-semibold">Resource Breakdown</h2>
            <p className="mt-1 text-xs text-(--text-muted)">
              Sorted by highest severity and threat volume.
            </p>
          </div>
          <div className="divide-y divide-(--border)">
            {filteredRows.map((resource) => {
              const topSeverity = resource.topSeverity.toLowerCase();
              return (
                <article key={resource.id} className="px-5 py-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold truncate">
                        {resource.label}
                      </h3>
                      <p className="text-xs text-(--text-muted) mt-1">
                        {resource.id}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.11em]">
                        <span className="border border-white/15 bg-white/7 px-2 py-1">
                          {resource.shortType}
                        </span>
                        <span className="border border-white/15 bg-white/7 px-2 py-1">
                          {resource.provider}
                        </span>
                        <span className="border border-white/15 bg-white/7 px-2 py-1">
                          {resource.threatSurface}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-(--text-muted) uppercase tracking-[0.12em]">
                        Findings {resource.threatCount}
                      </span>
                      <span
                        className={`text-xs border px-2 py-1 uppercase tracking-[0.12em] ${severityClass(topSeverity)}`}
                      >
                        {resource.topSeverity}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
                    <div className="border border-(--border) rounded-lg p-3 bg-white/3">
                      <p className="text-xs uppercase tracking-[0.12em] text-(--text-muted)">
                        STRIDE Flags
                      </p>
                      {resource.strideKeys.length === 0 ? (
                        <p className="mt-2 text-sm text-(--text-secondary)">
                          No active STRIDE flags.
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {resource.strideKeys.map((flag) => (
                            <span key={flag} className="relative group">
                              <span className="text-[11px] border border-white/15 bg-white/6 px-2 py-1 cursor-help">
                                {flag}
                              </span>
                              <span className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-56 rounded-md border border-white/15 bg-[#111111] px-2.5 py-2 text-[11px] normal-case tracking-normal text-(--text-secondary) shadow-lg opacity-0 translate-y-1 invisible transition-all duration-150 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible">
                                {strideDescriptions[flag.replace(/[^a-z]/gi, "").toLowerCase()] ??
                                  "STRIDE security category for this resource."}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="border border-(--border) rounded-lg p-3 bg-white/3">
                      <p className="text-xs uppercase tracking-[0.12em] text-(--text-muted)">
                        Attributes
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
                        {Object.entries(resource.attributes)
                          .slice(0, 4)
                          .map(([key, value]) => (
                            <p key={key} className="truncate">
                              <span className="text-(--text-muted)">
                                {key}:{" "}
                              </span>
                              <span>{readableValue(value)}</span>
                            </p>
                          ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {filteredRows.length === 0 ? (
              <div className="px-5 py-10 text-sm text-(--text-secondary)">
                No resources match that query.
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
