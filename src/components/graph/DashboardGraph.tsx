import dagre from "@dagrejs/dagre";
import { useEffect, useMemo, useState } from "react";
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
import type {
  DashboardGraphData,
  DashboardGraphNode,
  GraphStrideFlags,
  ThreatItem,
} from "../../types/dashboardArtifacts";
import AppButton from "../AppButton";

const NODE_WIDTH = 172;
const NODE_HEIGHT = 44;
const NODE_HORIZONTAL_PADDING = 28;
const LABEL_CHAR_WIDTH_ESTIMATE = 7;

const THREAT_SURFACE_COLORS: Record<string, string> = {
  public: "#ef4444",
  internal: "#22c55e",
  network: "#f59e0b",
  iam: "#38bdf8",
  build: "#a78bfa",
};
const THREAT_SURFACE_LEGEND = [
  { label: "Public", color: THREAT_SURFACE_COLORS.public },
  { label: "Internal", color: THREAT_SURFACE_COLORS.internal },
  { label: "Network", color: THREAT_SURFACE_COLORS.network },
  { label: "IAM", color: THREAT_SURFACE_COLORS.iam },
  { label: "Build", color: THREAT_SURFACE_COLORS.build },
  { label: "Unknown", color: "rgba(255,255,255,0.5)" },
];

function getNodeThreats(node: DashboardGraphNode): ThreatItem[] {
  return node.threats ?? node.data?.threats ?? [];
}

function normalizeStrideFlags(
  strideFlags: GraphStrideFlags,
): string[] {
  if (Array.isArray(strideFlags)) return strideFlags;
  if (!strideFlags) return [];
  return Object.entries(strideFlags)
    .filter(([, isEnabled]) => Boolean(isEnabled))
    .map(([flag]) => flag);
}

type DashboardGraphProps = {
  graphData: DashboardGraphData;
  hoveredContext?:
    | {
      kind: "node" | "edge";
      id: string;
    }
    | {
      kind: "node" | "edge";
      id: string;
    }[]
    | null;
};

type GraphContext = {
  kind: "node" | "edge";
  id: string;
};

function toContextList(
  context: GraphContext | GraphContext[] | null | undefined,
): GraphContext[] {
  if (!context) return [];
  return Array.isArray(context) ? context : [context];
}

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
    const styleWidth =
      typeof node.style?.width === "number"
        ? node.style.width
        : Number.parseFloat(String(node.style?.width ?? NODE_WIDTH));
    const nodeWidth = Number.isFinite(styleWidth) ? styleWidth : NODE_WIDTH;
    graph.setNode(node.id, { width: nodeWidth, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id);
    const styleWidth =
      typeof node.style?.width === "number"
        ? node.style.width
        : Number.parseFloat(String(node.style?.width ?? NODE_WIDTH));
    const nodeWidth = Number.isFinite(styleWidth) ? styleWidth : NODE_WIDTH;

    return {
      ...node,
      position: {
        x: position.x - nodeWidth / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export default function DashboardGraph({
  graphData,
  hoveredContext = null,
}: DashboardGraphProps) {
  const [showMetadata, setShowMetadata] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedContext, setSelectedContext] = useState<{
    kind: "node" | "edge";
    id: string;
  } | null>(null);
  const [activeThreatContext, setActiveThreatContext] = useState<{
    kind: "node" | "edge";
    label: string;
    threats: ThreatItem[];
    subtitle?: string;
  } | null>(null);
  const baseNodes = useMemo<Node[]>(() => {
    return (graphData.nodes ?? []).map((node) => {
      const nodeThreats = getNodeThreats(node);
      const nodeData = node.data ?? {};
      const label = nodeData.shortType ?? nodeData.label ?? node.id;
      const computedNodeWidth = Math.max(
        NODE_WIDTH,
        String(label).length * LABEL_CHAR_WIDTH_ESTIMATE + NODE_HORIZONTAL_PADDING,
      );

      return {
        id: node.id,
        className: "dashboard-flow-node",
        position: node.position ?? { x: 0, y: 0 },
        data: {
          label,
          threatCount: nodeThreats.length,
          threats: nodeThreats,
          strideFlags: normalizeStrideFlags(nodeData.strideFlags),
        },
        style: {
          background: "#101216",
          color: "#ebebeb",
          border: `1px solid ${
            THREAT_SURFACE_COLORS[nodeData.threatSurface ?? ""] ??
            "rgba(255,255,255,0.18)"
          }`,
          borderRadius: "0",
          padding: "10px 14px",
          fontSize: "12px",
          width: `${computedNodeWidth}px`,
          whiteSpace: "nowrap",
          boxSizing: "border-box",
        },
      };
    });
  }, [graphData.nodes]);

  const baseEdges = useMemo<Edge[]>(() => {
    return (graphData.edges ?? []).map((edge) => {
      const hasBoundaryThreats = (edge.data?.boundaryThreats?.length ?? 0) > 0;

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        className: "dashboard-flow-edge",
        style: {
          stroke: hasBoundaryThreats
            ? "#fb7185"
            : edge.data?.trustBoundary
              ? "#f59e0b"
              : "rgba(255,255,255,0.45)",
          strokeWidth: hasBoundaryThreats
            ? 2.6
            : edge.data?.trustBoundary
              ? 2
              : 1.2,
          strokeDasharray: hasBoundaryThreats ? "4 4" : "8 6",
          strokeDashoffset: 0,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: hasBoundaryThreats ? "#fb7185" : "rgba(255,255,255,0.6)",
        },
        data: {
          boundaryThreats: edge.data?.boundaryThreats ?? [],
          trustBoundary: edge.data?.trustBoundary ?? false,
          relationshipType: edge.data?.relationshipType ?? "",
        },
      };
    });
  }, [graphData.edges]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(
    getLayoutedNodes(baseNodes, baseEdges),
  );
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(baseEdges);
  const metadata = graphData.metadata;

  useEffect(() => {
    setFlowNodes(getLayoutedNodes(baseNodes, baseEdges));
    setFlowEdges(baseEdges);
    setSelectedContext(null);
    setActiveThreatContext(null);
  }, [baseEdges, baseNodes, setFlowEdges, setFlowNodes]);

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
        const effectiveContexts = selectedContext
          ? [selectedContext]
          : toContextList(hoveredContext);
        const hasNodeFocus = effectiveContexts.some(
          (context) => context.kind === "node",
        );
        const isSelected = effectiveContexts.some(
          (context) => context.kind === "node" && context.id === node.id,
        );
        const isDimmed = hasNodeFocus && !isSelected;
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
    [flowNodes, hoveredContext, selectedContext],
  );

  const renderedEdges = useMemo(
    () =>
      flowEdges.map((edge) => {
        const effectiveContexts = selectedContext
          ? [selectedContext]
          : toContextList(hoveredContext);
        const boundaryThreats =
          (edge.data?.boundaryThreats as ThreatItem[] | undefined) ?? [];
        const hasBoundaryThreats =
          Boolean(edge.data?.trustBoundary) && boundaryThreats.length > 0;
        const hasEdgeFocus = effectiveContexts.some(
          (context) => context.kind === "edge",
        );
        const isSelected = effectiveContexts.some(
          (context) => context.kind === "edge" && context.id === edge.id,
        );
        const isDimmed = hasEdgeFocus && !isSelected;
        return {
          ...edge,
          className: [
            "dashboard-flow-edge",
            hasBoundaryThreats ? "dashboard-flow-edge-has-threat" : "",
            isSelected ? "dashboard-flow-edge-selected" : "",
            isDimmed ? "dashboard-flow-edge-dimmed" : "",
          ]
            .filter(Boolean)
            .join(" "),
        };
      }),
    [flowEdges, hoveredContext, selectedContext],
  );

  const onNodeMouseEnter: NodeMouseHandler = (_event, node) => {
    if (selectedContext) return;
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
    if (selectedContext) return;
    setActiveThreatContext(null);
  };

  const onEdgeMouseEnter: EdgeMouseHandler = (_event, edge) => {
    if (selectedContext) return;
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
    if (selectedContext) return;
    setActiveThreatContext(null);
  };

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    const threats = (node.data?.threats as ThreatItem[] | undefined) ?? [];
    if (threats.length === 0) {
      setSelectedContext(null);
      setActiveThreatContext(null);
      return;
    }

    if (selectedContext?.kind === "node" && selectedContext.id === node.id) {
      setSelectedContext(null);
      setActiveThreatContext(null);
      return;
    }

    const strideFlags = ((node.data?.strideFlags as string[] | undefined) ?? [])
      .filter(Boolean)
      .join(", ");

    setSelectedContext({ kind: "node", id: node.id });
    setActiveThreatContext({
      kind: "node",
      label: String(node.data?.label ?? node.id),
      subtitle: strideFlags ? `STRIDE: ${strideFlags}` : undefined,
      threats,
    });
  };

  const onEdgeClick: EdgeMouseHandler = (_event, edge) => {
    const threats =
      (edge.data?.boundaryThreats as ThreatItem[] | undefined) ?? [];
    const isTrustBoundary = Boolean(edge.data?.trustBoundary);
    if (!isTrustBoundary || threats.length === 0) {
      setSelectedContext(null);
      setActiveThreatContext(null);
      return;
    }

    if (selectedContext?.kind === "edge" && selectedContext.id === edge.id) {
      setSelectedContext(null);
      setActiveThreatContext(null);
      return;
    }

    setSelectedContext({ kind: "edge", id: edge.id });
    setActiveThreatContext({
      kind: "edge",
      label: `${edge.source} -> ${edge.target}`,
      subtitle: "Trust boundary threats",
      threats,
    });
  };

  const onPaneClick = () => {
    setSelectedContext(null);
    setActiveThreatContext(null);
  };

  const renderGraphCard = (expanded: boolean) => (
    <div
      className={`border border-(--border) bg-white/2 w-full overflow-hidden relative ${
        expanded
          ? "h-[90vh] max-h-[960px] rounded-none shadow-2xl"
          : "h-[520px] rounded-none"
      }`}
    >
      <div className="h-11 border-b border-white/10 bg-black/20 px-3 flex items-center justify-between">
        <h4 className="text-xs tracking-[0.12em] uppercase text-white/75 font-semibold">
          Architecture Graph
        </h4>
        <div className="flex items-center gap-2">
          <AppButton
            onClick={() => setIsExpanded((prev) => !prev)}
            variant="panel"
            size="panel"
            className="rounded-none"
          >
            {expanded ? "Close Expanded" : "Expand"}
          </AppButton>
          <AppButton
            onClick={() => setShowMetadata((prev) => !prev)}
            variant="panel"
            size="panel"
            className="rounded-none"
          >
            {showMetadata ? "Hide" : "Show"} Metadata
          </AppButton>
        </div>
      </div>

      <div className="h-[calc(100%-44px)] w-full">
        <ReactFlow
          className="dashboard-flow-canvas"
          nodes={renderedNodes}
          edges={renderedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
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
        <aside className="absolute bottom-3 right-3 z-10 w-[360px] max-w-[calc(100%-24px)] rounded-none border border-rose-300/25 bg-[#1b1012]/95 backdrop-blur-sm shadow-lg p-3">
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
                className="rounded-none border border-rose-300/20 bg-white/5 px-2.5 py-2"
              >
                <p className="text-[11px] font-semibold text-rose-100/95">
                  [{threat.category?.[0] ?? "?"}]{" "}
                  {threat.title ?? "Untitled threat"}
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
        <aside
          className="absolute top-14 left-3 z-20 w-[320px] max-w-[calc(100%-24px)] max-h-[calc(100%-68px)] overflow-auto rounded-none border border-white/15 bg-[#111318]/92 backdrop-blur-sm shadow-lg p-3"
          onWheel={(event) => {
            const panel = event.currentTarget;
            panel.scrollTop += event.deltaY;
            panel.scrollLeft += event.deltaX;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-xs tracking-[0.14em] uppercase text-white/70 font-semibold">
              Graph Intelligence
            </h4>
            <span className="text-[10px] text-white/50">terraform</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-none bg-white/5 border border-white/10 px-2.5 py-2">
              <div className="text-[10px] uppercase tracking-[0.1em] text-white/55">
                Nodes
              </div>
              <div className="text-lg font-semibold text-white/95">
                {graphData.nodes?.length ?? 0}
              </div>
            </div>
            <div className="rounded-none bg-white/5 border border-white/10 px-2.5 py-2">
              <div className="text-[10px] uppercase tracking-[0.1em] text-white/55">
                Edges
              </div>
              <div className="text-lg font-semibold text-white/95">
                {graphData.edges?.length ?? 0}
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
            <div className="mt-3 rounded-none border border-rose-300/25 bg-rose-300/10 px-2.5 py-2">
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
                    className="px-2 py-1 rounded-none border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 text-[11px]"
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
                <div className="rounded-none border border-amber-300/25 bg-amber-300/10 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-amber-100/80">
                    Parse Warnings ({parseWarnings.length})
                  </p>
                  <p className="mt-1 text-xs text-amber-50/95">
                    {parseWarnings[0]}
                  </p>
                </div>
              )}

              {unresolvedDataSources.length > 0 && (
                <div className="rounded-none border border-rose-300/25 bg-rose-300/10 px-2.5 py-2">
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

      {expanded && (
        <aside
          className={`absolute bottom-3 left-3 z-10 rounded-none border border-white/15 bg-[#111318]/92 backdrop-blur-sm shadow-lg p-3 transition-opacity ${showMetadata ? "opacity-35" : "opacity-100"}`}
        >
          <h4 className="text-[10px] tracking-[0.14em] uppercase text-white/70 font-semibold">
            Legend
          </h4>
          <div className="mt-2 space-y-1.5">
            {THREAT_SURFACE_LEGEND.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] text-white/85">{item.label}</span>
              </div>
            ))}
            <div className="pt-1 mt-1 border-t border-white/10 text-[10px] text-white/60">
              Subtle glow indicates active threats on nodes or boundaries.
            </div>
          </div>
        </aside>
      )}
    </div>
  );

  return (
    <>
      {isExpanded &&
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
          </div>,
          document.body,
        )}

      {!isExpanded && renderGraphCard(false)}
    </>
  );
}
