export type ThreatItem = {
  threatId?: string;
  stride?: string;
  category?: string;
  title?: string;
  description?: string;
  severity?: string;
  confidence?: string;
  evidence?: string[];
  mitigations?: string[];
};

export type GraphStrideFlags = string[] | Record<string, boolean> | undefined;

export type DashboardGraphNode = {
  id: string;
  position?: { x: number; y: number };
  threats?: ThreatItem[];
  data?: {
    label?: string;
    shortType?: string;
    address?: string;
    threatSurface?: string;
    threats?: ThreatItem[];
    strideFlags?: GraphStrideFlags;
  };
};

export type DashboardGraphEdge = {
  id: string;
  source: string;
  target: string;
  data?: {
    relationshipType?: string;
    trustBoundary?: boolean;
    boundaryThreats?: ThreatItem[];
  };
};

export type DashboardGraphData = {
  schemaVersion?: string;
  nodes?: DashboardGraphNode[];
  edges?: DashboardGraphEdge[];
  metadata?: {
    parsedAt?: string;
    sourceFiles?: string[];
    tfVersion?: string;
    unresolvedDataSources?: string[];
    parseWarnings?: string[];
    overallRiskScore?: number | string;
    riskRationale?: string;
    strideAnalysedAt?: string;
  };
};

type StrideNodeThreat = {
  address?: string;
  strideFlags?: Record<string, boolean>;
  threats?: ThreatItem[];
};

type StrideBoundaryThreat = {
  from?: string;
  to?: string;
  threats?: ThreatItem[];
};

export type StrideArtifact = {
  analysedAt?: string;
  overallRiskScore?: number;
  riskRationale?: string;
  nodeThreats?: StrideNodeThreat[];
  trustBoundaryThreats?: StrideBoundaryThreat[];
};

function toSeverityValue(severity: string | undefined): string | undefined {
  if (!severity) return undefined;
  return severity.toLowerCase();
}

function normalizeThreat(threat: ThreatItem): ThreatItem {
  return {
    ...threat,
    severity: toSeverityValue(threat.severity),
  };
}

function normalizeThreatList(threats: ThreatItem[] | undefined): ThreatItem[] {
  return (threats ?? []).map(normalizeThreat);
}

function getNodeAddress(node: DashboardGraphNode): string | undefined {
  return node.data?.address ?? node.data?.label;
}

function mapNodeThreats(stride: StrideArtifact | null): Map<string, StrideNodeThreat> {
  const byAddress = new Map<string, StrideNodeThreat>();
  for (const entry of stride?.nodeThreats ?? []) {
    if (entry.address) byAddress.set(entry.address, entry);
  }
  return byAddress;
}

function mapBoundaryThreats(
  stride: StrideArtifact | null,
): Map<string, StrideBoundaryThreat> {
  const byEdge = new Map<string, StrideBoundaryThreat>();
  for (const entry of stride?.trustBoundaryThreats ?? []) {
    if (!entry.from || !entry.to) continue;
    byEdge.set(`${entry.from}->${entry.to}`, entry);
  }
  return byEdge;
}

export function mergeGraphWithStride(
  graph: DashboardGraphData,
  stride: StrideArtifact | null,
): DashboardGraphData {
  const nodeThreatsByAddress = mapNodeThreats(stride);
  const boundaryThreatsByEdge = mapBoundaryThreats(stride);

  const nodes = (graph.nodes ?? []).map((node) => {
    const address = getNodeAddress(node);
    const strideNode = address ? nodeThreatsByAddress.get(address) : undefined;
    const mergedThreats = normalizeThreatList(
      strideNode?.threats ?? node.threats ?? node.data?.threats,
    );

    return {
      ...node,
      threats: mergedThreats,
      data: {
        ...(node.data ?? {}),
        threats: mergedThreats,
        strideFlags: strideNode?.strideFlags ?? node.data?.strideFlags,
      },
    };
  });

  const edges = (graph.edges ?? []).map((edge) => {
    const strideEdge = boundaryThreatsByEdge.get(`${edge.source}->${edge.target}`);
    const mergedBoundaryThreats = normalizeThreatList(
      strideEdge?.threats ?? edge.data?.boundaryThreats,
    );

    return {
      ...edge,
      data: {
        ...(edge.data ?? {}),
        boundaryThreats: mergedBoundaryThreats,
      },
    };
  });

  return {
    ...graph,
    nodes,
    edges,
    metadata: {
      ...(graph.metadata ?? {}),
      overallRiskScore:
        stride?.overallRiskScore ?? graph.metadata?.overallRiskScore ?? 0,
      riskRationale:
        stride?.riskRationale ??
        graph.metadata?.riskRationale ??
        "Pending STRIDE analysis",
      strideAnalysedAt:
        stride?.analysedAt ?? graph.metadata?.strideAnalysedAt,
    },
  };
}
