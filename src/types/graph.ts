export const STRIDE_GRAPH_SCHEMA_VERSION = "1.0.0" as const;

export type ThreatCategory =
  | "Spoofing"
  | "Tampering"
  | "Repudiation"
  | "Information Disclosure"
  | "Denial of Service"
  | "Elevation of Privilege";

export type ThreatSeverity = "low" | "medium" | "high" | "critical";

export type ThreatConfidence = "low" | "medium" | "high";

export interface ThreatFinding {
  threatId: string;
  category: ThreatCategory;
  title: string;
  description: string;
  severity: ThreatSeverity;
  confidence: ThreatConfidence;
  evidence: string[];
}

export interface StrideFlags {
  spoofing: boolean;
  tampering: boolean;
  repudiation: boolean;
  informationDisclosure: boolean;
  denialOfService: boolean;
  elevationOfPrivilege: boolean;
}

export interface NodePosition {
  x: number;
  y: number;
}

export type ThreatSurface =
  | "public"
  | "internal"
  | "iam"
  | "build"
  | "data"
  | "control";

export interface GraphNodeData {
  label: string;
  resourceType: string;
  shortType: string;
  provider: string;
  address: string;
  attributes: Record<string, unknown>;
  threatSurface: ThreatSurface;
  strideFlags: StrideFlags;
  cvssScore: number | null;
  threats: ThreatFinding[];
}

export type GraphNodeType = "awsNode" | "buildNode";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  position: NodePosition;
  data: GraphNodeData;
}

export interface GraphEdgeData {
  relationshipType: string;
  resolvedFrom: string | null;
  trustBoundary: boolean;
  boundaryThreats: ThreatFinding[];
}

export type GraphEdgeType = "dependencyEdge" | "buildEdge";

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  data: GraphEdgeData;
}

export interface GraphMetadata {
  parsedAt: string;
  sourceFiles: string[];
  tfVersion: string;
  unresolvedDataSources: string[];
  parseWarnings: string[];
  overallRiskScore: number;
  riskRationale: string;
  strideAnalysedAt: string;
}

export interface StrideGraph {
  schemaVersion: typeof STRIDE_GRAPH_SCHEMA_VERSION;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: GraphMetadata;
}
