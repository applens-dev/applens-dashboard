import dagre from "@dagrejs/dagre";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ReactFlow, {
  MarkerType,
  Background,
  Controls,
  useEdgesState,
  useNodesState,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import graphData from "../../data/strideGraph.json";

type ThreatItem = {
  stride?: string;
  title?: string;
  description?: string;
  mitigations?: string[];
};

type RawGraphNode = {
  id: string;
  position: { x: number; y: number };
  threats?: ThreatItem[];
  data: {
    label?: string;
    shortType?: string;
    threatSurface?: string;
    threats?: ThreatItem[];
    strideFlags?: string[] | Record<string, boolean>;
  };
};

type RawGraphEdge = {
  id: string;
  source: string;
  target: string;
  data?: {
    relationshipType?: string;
    trustBoundary?: boolean;
    boundaryThreats?: ThreatItem[];
  };
};

type RawDashboardGraphData = {
  nodes: RawGraphNode[];
  edges: RawGraphEdge[];
  metadata?: {
    parsedAt?: string;
    sourceFiles?: string[];
    tfVersion?: string;
    unresolvedDataSources?: string[];
    parseWarnings?: string[];
    overallRiskScore?: string | number;
    riskRationale?: string;
    strideAnalysedAt?: string;
  };
};

const typedGraphData = graphData as RawDashboardGraphData;
const NODE_WIDTH = 172;
const NODE_HEIGHT = 44;

const THREAT_SURFACE_COLORS: Record<string, string> = {
  public: "#ef4444",
  internal: "#22c55e",
  network: "#f59e0b",
  iam: "#38bdf8",
  build: "#a78bfa",
};

function getNodeThreats(node: RawGraphNode): ThreatItem[] {
  return node.threats ?? node.data.threats ?? [];
}

function normalizeStrideFlags(
  strideFlags: RawGraphNode["data"]["strideFlags"],
): string[] {
  if (Array.isArray(strideFlags)) return strideFlags;
  if (!strideFlags) return [];
  return Object.entries(strideFlags)
    .filter(([, isEnabled]) => Boolean(isEnabled))
    .map(([flag]) => flag);
}

const baseNodes: Node[] = typedGraphData.nodes.map((node) => ({
  id: node.id,
  className: "dashboard-flow-node",
  position: node.position,
  data: {
    label: node.data.shortType ?? node.data.label ?? node.id,
    threatCount: getNodeThreats(node).length,
    threats: getNodeThreats(node),
    strideFlags: normalizeStrideFlags(node.data.strideFlags),
  },
  style: {
    background: "#101216",
    color: "#ebebeb",
    border: `1px solid ${
      THREAT_SURFACE_COLORS[node.data.threatSurface ?? ""] ??
      "rgba(255,255,255,0.18)"
    }`,
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "12px",
  },
}));

const edges: Edge[] = typedGraphData.edges.map((edge) => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  className: "dashboard-flow-edge",
  label: edge.data?.trustBoundary
    ? `${edge.data.relationshipType?.replaceAll("_", " ")} • boundary`
    : edge.data?.relationshipType?.replaceAll("_", " "),
  labelShowBg: true,
  labelBgPadding: [6, 3],
  labelBgBorderRadius: 6,
  labelBgStyle: {
    fill: "#0f0f0f",
    fillOpacity: 0.95,
  },
  labelStyle: { fill: "rgba(235,235,235,0.9)", fontSize: 10 },
  style: {
    stroke: edge.data?.trustBoundary ? "#f59e0b" : "rgba(255,255,255,0.45)",
    strokeWidth: edge.data?.trustBoundary ? 2 : 1.2,
    strokeDasharray: "8 6",
    strokeDashoffset: 0,
  },
  markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.6)" },
  data: {
    boundaryThreats: edge.data?.boundaryThreats ?? [],
    trustBoundary: edge.data?.trustBoundary ?? false,
    relationshipType: edge.data?.relationshipType ?? "",
  },
}));

function getLayoutedNodes(nodes: Node[], edges: Edge[]) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    ranksep: 80,
    nodesep: 48,
    marginx: 32,
    marginy: 32,
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id);

    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export default function DashboardGraph() {
  const [showMetadata, setShowMetadata] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeThreatContext, setActiveThreatContext] = useState<{
    kind: "node" | "edge";
    label: string;
    threats: ThreatItem[];
    subtitle?: string;
  } | null>(null);
  const [flowNodes, , onNodesChange] = useNodesState(
    getLayoutedNodes(baseNodes, edges),
  );
  const [flowEdges, , onEdgesChange] = useEdgesState(edges);
  const metadata = typedGraphData.metadata;

  const parsedAtLabel = metadata?.parsedAt
    ? new Date(metadata.parsedAt).toLocaleString()
    : "Unknown";
  const sourceFiles = metadata?.sourceFiles ?? [];
  const parseWarnings = metadata?.parseWarnings ?? [];
  const unresolvedDataSources = metadata?.unresolvedDataSources ?? [];
  const analysedAtLabel = metadata?.strideAnalysedAt
    ? new Date(metadata.strideAnalysedAt).toLocaleString()
    : "Unknown";

  const renderedNodes = useMemo(
    () =>
      flowNodes.map((node) => {
        const isSelected = selectedNodeId === node.id;
        const isDimmed = Boolean(selectedNodeId) && !isSelected;
        return {
          ...node,
          className: [
            "dashboard-flow-node",
            isSelected ? "dashboard-flow-node-selected" : "",
            isDimmed ? "dashboard-flow-node-dimmed" : "",
          ]
            .filter(Boolean)
            .join(" "),
        };
      }),
    [flowNodes, selectedNodeId],
  );

  const onNodeMouseEnter: NodeMouseHandler = (_event, node) => {
    if (selectedNodeId) return;
    const threats = (node.data?.threats as ThreatItem[] | undefined) ?? [];
    if (threats.length === 0) {
      setActiveThreatContext(null);
      return;
    }

    const strideFlags = ((node.data?.strideFlags as string[] | undefined) ?? [])
      .filter(Boolean)
      .join(", ");
    setActiveThreatContext({
      kind: "node",
      label: String(node.data?.label ?? node.id),
      subtitle: strideFlags ? `STRIDE: ${strideFlags}` : undefined,
      threats,
    });
  };

  const onNodeMouseLeave: NodeMouseHandler = () => {
    if (selectedNodeId) return;
    setActiveThreatContext(null);
  };

  const onEdgeMouseEnter: EdgeMouseHandler = (_event, edge) => {
    if (selectedNodeId) return;
    const threats =
      (edge.data?.boundaryThreats as ThreatItem[] | undefined) ?? [];
    const isTrustBoundary = Boolean(edge.data?.trustBoundary);
    if (!isTrustBoundary || threats.length === 0) {
      setActiveThreatContext(null);
      return;
    }

    setActiveThreatContext({
      kind: "edge",
      label: `${edge.source} -> ${edge.target}`,
      subtitle: "Trust boundary threats",
      threats,
    });
  };

  const onEdgeMouseLeave: EdgeMouseHandler = () => {
    if (selectedNodeId) return;
    setActiveThreatContext(null);
  };

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    const threats = (node.data?.threats as ThreatItem[] | undefined) ?? [];
    if (threats.length === 0) {
      setSelectedNodeId(null);
      setActiveThreatContext(null);
      return;
    }

    if (selectedNodeId === node.id) {
      setSelectedNodeId(null);
      setActiveThreatContext(null);
      return;
    }

    const strideFlags = ((node.data?.strideFlags as string[] | undefined) ?? [])
      .filter(Boolean)
      .join(", ");

    setSelectedNodeId(node.id);
    setActiveThreatContext({
      kind: "node",
      label: String(node.data?.label ?? node.id),
      subtitle: strideFlags ? `STRIDE: ${strideFlags}` : undefined,
      threats,
    });
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
    setActiveThreatContext(null);
  };

  const renderGraphCard = (expanded: boolean) => (
    <div
      className={`border border-(--border) bg-white/2 w-full overflow-hidden relative ${
        expanded
          ? "h-[90vh] max-h-[960px] rounded-2xl shadow-2xl"
          : "h-[520px] rounded-xl"
      }`}
    >
      <div className="h-11 border-b border-white/10 bg-black/20 px-3 flex items-center justify-between">
        <h4 className="text-xs tracking-[0.12em] uppercase text-white/75 font-semibold">
          Architecture Graph
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-md border cursor-pointer border-white/20 bg-white/5 text-[11px] tracking-[0.08em] uppercase text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            {expanded ? "Close Expanded" : "Expand"}
          </button>
          <button
            type="button"
            onClick={() => setShowMetadata((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-md border cursor-pointer border-white/20 bg-white/5 text-[11px] tracking-[0.08em] uppercase text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            {showMetadata ? "Hide" : "Show"} Metadata
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-44px)] w-full">
        <ReactFlow
          className="dashboard-flow-canvas"
          nodes={renderedNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(255,255,255,0.12)" gap={22} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {activeThreatContext && (
        <aside className="absolute bottom-3 right-3 z-10 w-[360px] max-w-[calc(100%-24px)] rounded-xl border border-rose-300/25 bg-[#1b1012]/95 backdrop-blur-sm shadow-lg p-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-xs tracking-[0.14em] uppercase text-rose-100/85 font-semibold">
              {activeThreatContext.kind === "edge"
                ? "Boundary Threats"
                : "Node Threats"}
            </h4>
            <span className="text-[10px] text-rose-100/60">
              {activeThreatContext.threats.length} issue
              {activeThreatContext.threats.length > 1 ? "s" : ""}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/85 break-all">
            {activeThreatContext.label}
          </p>
          {activeThreatContext.subtitle && (
            <p className="mt-1 text-[11px] text-rose-100/70">
              {activeThreatContext.subtitle}
            </p>
          )}

          <div className="mt-2.5 max-h-[210px] overflow-auto space-y-2 pr-1">
            {activeThreatContext.threats.map((threat, index) => (
              <div
                key={`${threat.title ?? "threat"}-${index}`}
                className="rounded-lg border border-rose-300/20 bg-white/5 px-2.5 py-2"
              >
                <p className="text-[11px] font-semibold text-rose-100/95">
                  [{threat.stride ?? "?"}] {threat.title ?? "Untitled threat"}
                </p>
                <p className="mt-1 text-[11px] text-rose-50/90">
                  {threat.description ?? "No description provided."}
                </p>
              </div>
            ))}
          </div>
        </aside>
      )}

      {showMetadata && (
        <aside className="absolute top-14 left-3 z-10 w-[320px] max-w-[calc(100%-24px)] max-h-[calc(100%-68px)] overflow-auto rounded-xl border border-white/15 bg-[#111318]/92 backdrop-blur-sm shadow-lg p-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-xs tracking-[0.14em] uppercase text-white/70 font-semibold">
              Graph Intelligence
            </h4>
            <span className="text-[10px] text-white/50">terraform</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2">
              <div className="text-[10px] uppercase tracking-[0.1em] text-white/55">
                Nodes
              </div>
              <div className="text-lg font-semibold text-white/95">
                {typedGraphData.nodes.length}
              </div>
            </div>
            <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2">
              <div className="text-[10px] uppercase tracking-[0.1em] text-white/55">
                Edges
              </div>
              <div className="text-lg font-semibold text-white/95">
                {typedGraphData.edges.length}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 text-xs">
            <p className="text-white/75">
              Parsed: <span className="text-white/95">{parsedAtLabel}</span>
            </p>
            <p className="text-white/75">
              STRIDE: <span className="text-white/95">{analysedAtLabel}</span>
            </p>
            <p className="text-white/75">
              Terraform:{" "}
              <span className="text-white/95">
                {metadata?.tfVersion ?? "Unknown"}
              </span>
            </p>
            <p className="text-white/75">
              Risk Score:{" "}
              <span className="text-rose-200 font-semibold">
                {metadata?.overallRiskScore ?? "Unknown"}
              </span>
            </p>
          </div>

          {metadata?.riskRationale && (
            <div className="mt-3 rounded-lg border border-rose-300/25 bg-rose-300/10 px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-rose-100/80">
                Risk Rationale
              </p>
              <p className="mt-1 text-xs text-rose-50/95">
                {metadata.riskRationale}
              </p>
            </div>
          )}

          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/55 mb-1.5">
              Source Files
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sourceFiles.length === 0 ? (
                <span className="text-xs text-white/45">None</span>
              ) : (
                sourceFiles.map((file) => (
                  <span
                    key={file}
                    className="px-2 py-1 rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 text-[11px]"
                  >
                    {file}
                  </span>
                ))
              )}
            </div>
          </div>

          {(parseWarnings.length > 0 || unresolvedDataSources.length > 0) && (
            <div className="mt-3 space-y-2">
              {parseWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-amber-100/80">
                    Parse Warnings ({parseWarnings.length})
                  </p>
                  <p className="mt-1 text-xs text-amber-50/95">
                    {parseWarnings[0]}
                  </p>
                </div>
              )}

              {unresolvedDataSources.length > 0 && (
                <div className="rounded-lg border border-rose-300/25 bg-rose-300/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-rose-100/85">
                    Unresolved ({unresolvedDataSources.length})
                  </p>
                  <p className="mt-1 text-xs text-rose-50/95">
                    {unresolvedDataSources[0]}
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );

  return (
    <>
      {isExpanded && (
        createPortal(
          <div
            className="dashboard-expand-backdrop fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm p-4 sm:p-6 lg:p-8"
            onClick={() => setIsExpanded(false)}
          >
            <div
              className="dashboard-expand-panel mx-auto h-full w-full max-w-[1500px] flex items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              {renderGraphCard(true)}
            </div>
          </div>
          ,
          document.body,
        )
      )}

      {!isExpanded && renderGraphCard(false)}
    </>
  );
}
