import { z } from 'zod';

// Node Types
export const NodeTypeSchema = z.enum([
  'router',
  'switch',
  'firewall',
  'modem',
  'server',
  'workstation',
  'mobile',
  'iot',
  'tdl',
  'hacking-device',
  'cloud-service',
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

// Link Types
export const LinkTypeSchema = z.enum([
  'ethernet',
  'wifi',
  'wan',
  'vpn',
  'serial',
  'tdl',
]);

export type LinkType = z.infer<typeof LinkTypeSchema>;

// Severity Levels
export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type Severity = z.infer<typeof SeveritySchema>;

// Interface Schema
export const InterfaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  ipAddress: z.string().optional(),
  subnet: z.string().optional(),
  macAddress: z.string().optional(),
  enabled: z.boolean().default(true),
});

export type Interface = z.infer<typeof InterfaceSchema>;

// Node Schema
export const NodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  label: z.string(),
  role: z.string().optional(),
  os: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).default([]),
  riskCriticality: SeveritySchema.default('medium'),
  interfaces: z.array(InterfaceSchema).default([]),
  properties: z.record(z.unknown()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export type Node = z.infer<typeof NodeSchema>;

// Link Schema
export const LinkSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: LinkTypeSchema,
  bandwidth: z.number().default(1000), // Mbps
  latency: z.number().default(0), // ms
  loss: z.number().min(0).max(100).default(0), // percentage
  jitter: z.number().default(0), // ms
  canFail: z.boolean().default(false),
  failed: z.boolean().default(false),
  label: z.string().optional(),
});

export type Link = z.infer<typeof LinkSchema>;

// Graph Schema
export const GraphSchema = z.object({
  nodes: z.array(NodeSchema),
  links: z.array(LinkSchema),
  metadata: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
    .optional(),
});

export type Graph = z.infer<typeof GraphSchema>;

// Flow/Traffic Schema
export const FlowSchema = z.object({
  id: z.string(),
  from: z.string(), // node id
  to: z.string(), // node id
  protocol: z.string(), // tcp, udp, icmp, etc.
  port: z.number().optional(),
  rate: z.number().default(1), // packets per second or similar
  label: z.string().optional(),
});

export type Flow = z.infer<typeof FlowSchema>;

// Fault Injection Schema
export const FaultSchema = z.object({
  id: z.string(),
  type: z.enum(['link-down', 'link-degraded', 'node-down', 'policy-block', 'dns-failure']),
  targetId: z.string(), // link or node id
  startTime: z.number().default(0), // simulation time in ms
  duration: z.number().optional(), // ms, undefined = permanent
  params: z.record(z.unknown()).optional(),
});

export type Fault = z.infer<typeof FaultSchema>;

// Attack Event Schema (state transition, not exploit)
export const AttackEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    'credential-reuse',
    'phishing-compromise',
    'lateral-movement',
    'data-exfil-attempt',
    'privilege-escalation',
    'recon-scan',
  ]),
  sourceNodeId: z.string(),
  targetNodeId: z.string().optional(),
  timestamp: z.number(), // simulation time
  blocked: z.boolean().default(false),
  blockedBy: z.string().optional(), // policy/node that blocked it
  metadata: z.record(z.unknown()).optional(),
});

export type AttackEvent = z.infer<typeof AttackEventSchema>;

// Scenario Schema
export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  topologyId: z.string(),
  flows: z.array(FlowSchema).default([]),
  faults: z.array(FaultSchema).default([]),
  attackEvents: z.array(AttackEventSchema).default([]),
  duration: z.number().default(60000), // simulation duration in ms
  options: z.record(z.unknown()).optional(),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

// Simulation Event Schema
export const SimEventSchema = z.object({
  timestamp: z.number(),
  type: z.enum([
    'flow-start',
    'flow-end',
    'packet-sent',
    'packet-received',
    'packet-dropped',
    'fault-injected',
    'fault-resolved',
    'policy-block',
    'attack-event',
  ]),
  nodeId: z.string().optional(),
  linkId: z.string().optional(),
  flowId: z.string().optional(),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type SimEvent = z.infer<typeof SimEventSchema>;

// Metrics Schema
export const MetricsSchema = z.object({
  reachabilityMatrix: z.record(z.record(z.boolean())), // sourceId -> targetId -> reachable
  latencyMatrix: z.record(z.record(z.number())), // sourceId -> targetId -> latency (ms)
  packetsProcessed: z.number(),
  packetsDropped: z.number(),
  policiesEvaluated: z.number(),
  policiesBlocked: z.number(),
});

export type Metrics = z.infer<typeof MetricsSchema>;

// Finding Schema
export const FindingSchema = z.object({
  id: z.string(),
  runId: z.string().optional(),
  severity: SeveritySchema,
  title: z.string(),
  description: z.string(),
  affectedNodeIds: z.array(z.string()).default([]),
  affectedLinkIds: z.array(z.string()).default([]),
  evidence: z.record(z.unknown()).optional(),
  remediation: z.string().optional(),
  category: z.string().optional(),
  createdAt: z.string(),
});

export type Finding = z.infer<typeof FindingSchema>;

// Run Result Schema
export const RunResultSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  status: z.enum(['running', 'completed', 'failed']),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
  events: z.array(SimEventSchema),
  metrics: MetricsSchema,
  findings: z.array(FindingSchema),
  blastRadius: z
    .object({
      compromisedNodeId: z.string(),
      affectedNodeIds: z.array(z.string()),
      affectedLinkIds: z.array(z.string()),
      impactScore: z.number(),
    })
    .optional(),
});

export type RunResult = z.infer<typeof RunResultSchema>;

// Project Schema
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;

// Topology Schema
export const TopologySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  graph: GraphSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Topology = z.infer<typeof TopologySchema>;

// Report Schema
export const ReportSchema = z.object({
  id: z.string(),
  runId: z.string(),
  format: z.enum(['json', 'pdf']),
  path: z.string(),
  createdAt: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type Report = z.infer<typeof ReportSchema>;
