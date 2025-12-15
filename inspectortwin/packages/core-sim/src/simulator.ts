import {
  Graph,
  Scenario,
  RunResult,
  SimEvent,
  Metrics,
  Finding,
  Flow,
  Fault,
  AttackEvent,
} from '@inspectortwin/shared';
import { PolicyEvaluator, PolicyParser, EvaluationContext } from '@inspectortwin/policy-dsl';
import {
  buildReachabilityMatrix,
  buildLatencyMatrix,
  findPath,
  validateGraph,
} from './validation.js';
import { randomUUID } from 'crypto';

export interface SimulationOptions {
  verbose?: boolean;
  timeStep?: number; // ms per simulation step
}

export class SimulationEngine {
  private events: SimEvent[] = [];
  private currentTime: number = 0;
  private packetsProcessed: number = 0;
  private packetsDropped: number = 0;
  private policiesEvaluated: number = 0;
  private policiesBlocked: number = 0;

  async simulate(graph: Graph, scenario: Scenario, options: SimulationOptions = {}): Promise<RunResult> {
    const startTime = new Date().toISOString();
    this.reset();

    // Validate graph first
    const validation = validateGraph(graph);
    if (!validation.valid) {
      return {
        id: randomUUID(),
        scenarioId: scenario.id,
        status: 'failed',
        startedAt: startTime,
        finishedAt: new Date().toISOString(),
        events: [
          {
            timestamp: 0,
            type: 'fault-injected',
            message: `Graph validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
          },
        ],
        metrics: this.buildMetrics(graph),
        findings: [],
      };
    }

    // Add validation warnings as findings
    const findings: Finding[] = validation.warnings.map((w) => ({
      id: randomUUID(),
      severity: 'medium',
      title: 'Topology Warning',
      description: w.message,
      affectedNodeIds: w.nodeId ? [w.nodeId] : [],
      affectedLinkIds: w.linkId ? [w.linkId] : [],
      createdAt: new Date().toISOString(),
    }));

    // Apply faults
    const modifiedGraph = this.applyFaults(graph, scenario.faults);

    // Simulate flows
    for (const flow of scenario.flows) {
      await this.simulateFlow(modifiedGraph, flow, scenario, findings);
    }

    // Simulate attack events
    for (const attackEvent of scenario.attackEvents) {
      await this.simulateAttackEvent(modifiedGraph, attackEvent, scenario, findings);
    }

    // Analyze for additional findings
    this.analyzeTopology(modifiedGraph, findings);

    const finishTime = new Date().toISOString();

    return {
      id: randomUUID(),
      scenarioId: scenario.id,
      status: 'completed',
      startedAt: startTime,
      finishedAt: finishTime,
      events: this.events,
      metrics: this.buildMetrics(modifiedGraph),
      findings,
    };
  }

  private reset(): void {
    this.events = [];
    this.currentTime = 0;
    this.packetsProcessed = 0;
    this.packetsDropped = 0;
    this.policiesEvaluated = 0;
    this.policiesBlocked = 0;
  }

  private applyFaults(graph: Graph, faults: Fault[]): Graph {
    const modifiedGraph = JSON.parse(JSON.stringify(graph)) as Graph;

    for (const fault of faults) {
      this.addEvent({
        timestamp: fault.startTime,
        type: 'fault-injected',
        message: `Fault injected: ${fault.type} on ${fault.targetId}`,
      });

      if (fault.type === 'link-down') {
        const link = modifiedGraph.links.find((l: any) => l.id === fault.targetId);
        if (link) {
          link.failed = true;
        }
      } else if (fault.type === 'link-degraded') {
        const link = modifiedGraph.links.find((l: any) => l.id === fault.targetId);
        if (link && fault.params) {
          if (fault.params.latency) link.latency = fault.params.latency as number;
          if (fault.params.loss) link.loss = fault.params.loss as number;
        }
      } else if (fault.type === 'node-down') {
        // Remove all links connected to this node
        const nodeLinks = modifiedGraph.links.filter(
          (l: any) => l.source === fault.targetId || l.target === fault.targetId
        );
        nodeLinks.forEach((l: any) => (l.failed = true));
      }
    }

    return modifiedGraph;
  }

  private async simulateFlow(
    graph: Graph,
    flow: Flow,
    scenario: Scenario,
    findings: Finding[]
  ): Promise<void> {
    this.addEvent({
      timestamp: this.currentTime,
      type: 'flow-start',
      flowId: flow.id,
      message: `Flow started: ${flow.from} → ${flow.to} (${flow.protocol})`,
    });

    // Find path
    const path = findPath(graph, flow.from, flow.to);

    if (!path) {
      this.addEvent({
        timestamp: this.currentTime,
        type: 'packet-dropped',
        flowId: flow.id,
        message: `No path found from ${flow.from} to ${flow.to}`,
      });
      this.packetsDropped++;

      findings.push({
        id: randomUUID(),
        severity: 'high',
        title: 'Unreachable Destination',
        description: `Node ${flow.from} cannot reach ${flow.to}`,
        affectedNodeIds: [flow.from, flow.to],
        affectedLinkIds: [],
        remediation: 'Add network connectivity or check for failed links',
        createdAt: new Date().toISOString(),
      });

      return;
    }

    // Check firewall policies
    const firewallNode = graph.nodes.find((n: any) => n.type === 'firewall' && path.path.includes(n.id));

    if (firewallNode) {
      const policyResult = this.evaluatePolicy(firewallNode, flow, graph);

      this.policiesEvaluated++;

      if (!policyResult.allowed) {
        this.policiesBlocked++;
        this.packetsDropped++;

        this.addEvent({
          timestamp: this.currentTime,
          type: 'policy-block',
          nodeId: firewallNode.id,
          flowId: flow.id,
          message: `Flow blocked by firewall ${firewallNode.label}: ${policyResult.reason}`,
        });

        findings.push({
          id: randomUUID(),
          severity: 'info',
          title: 'Traffic Blocked by Policy',
          description: `Flow from ${flow.from} to ${flow.to} was blocked by firewall policy`,
          affectedNodeIds: [firewallNode.id],
          affectedLinkIds: [],
          category: 'policy-enforcement',
          evidence: { flow, rule: policyResult.matchedRule },
          createdAt: new Date().toISOString(),
        });

        return;
      }
    }

    // Simulate packet transmission
    for (const nodeId of path.path) {
      this.addEvent({
        timestamp: this.currentTime,
        type: 'packet-sent',
        nodeId,
        flowId: flow.id,
        message: `Packet at node ${nodeId}`,
      });
      this.currentTime += 10; // Small time increment
    }

    this.packetsProcessed++;

    this.addEvent({
      timestamp: this.currentTime,
      type: 'flow-end',
      flowId: flow.id,
      message: `Flow completed: ${flow.from} → ${flow.to}`,
    });
  }

  private evaluatePolicy(
    firewallNode: any,
    flow: Flow,
    graph: Graph
  ): { allowed: boolean; reason: string; matchedRule?: any } {
    // Get firewall policy from node properties
    const policyDSL = firewallNode.properties?.policy || 'deny any from Any to Any';

    const parser = new PolicyParser();
    const ast = parser.parse(policyDSL);
    const evaluator = new PolicyEvaluator(ast);

    // Build node tags map
    const nodeTagsMap = new Map<string, string[]>();
    for (const node of graph.nodes) {
      nodeTagsMap.set(node.id, node.tags);
    }

    const context: EvaluationContext = {
      sourceNodeId: flow.from,
      destNodeId: flow.to,
      protocol: flow.protocol,
      port: flow.port,
      nodeTagsMap,
    };

    return evaluator.evaluate(context);
  }

  private async simulateAttackEvent(
    graph: Graph,
    event: AttackEvent,
    scenario: Scenario,
    findings: Finding[]
  ): Promise<void> {
    this.addEvent({
      timestamp: event.timestamp,
      type: 'attack-event',
      nodeId: event.sourceNodeId,
      message: `Attack event: ${event.type} from ${event.sourceNodeId}`,
      metadata: event.metadata,
    });

    let blocked = false;
    let blockedBy: string | undefined;

    // Check if target is reachable
    if (event.targetNodeId) {
      const path = findPath(graph, event.sourceNodeId, event.targetNodeId);
      
      if (!path) {
        blocked = true;
        blockedBy = 'network-isolation';
      } else {
        // Check if there's TLS/encryption
        const firewallInPath = graph.nodes.find((n: any) => n.type === 'firewall' && path.path.includes(n.id));
        if (firewallInPath) {
          blocked = true;
          blockedBy = firewallInPath.id;
        }
      }
    }

    const severity = blocked ? 'low' : 'high';

    findings.push({
      id: randomUUID(),
      severity,
      title: `Attack Event: ${event.type}`,
      description: blocked
        ? `Attack attempt from ${event.sourceNodeId} was blocked by ${blockedBy}`
        : `Attack event ${event.type} from ${event.sourceNodeId} was successful`,
      affectedNodeIds: event.targetNodeId ? [event.sourceNodeId, event.targetNodeId] : [event.sourceNodeId],
      affectedLinkIds: [],
      category: 'security',
      evidence: { event, blocked, blockedBy },
      remediation: blocked ? 'No action needed - attack was blocked' : 'Implement network segmentation and monitoring',
      createdAt: new Date().toISOString(),
    });
  }

  private analyzeTopology(graph: Graph, findings: Finding[]): void {
    // Check for exposed services
    for (const node of graph.nodes) {
      if (node.type === 'server' && node.tags.includes('public')) {
        // Check if there's TLS/encryption
        const hasTLS = node.properties?.tls === true || node.properties?.https === true;

        if (!hasTLS) {
          findings.push({
            id: randomUUID(),
            severity: 'medium',
            title: 'Public Service Without TLS',
            description: `Server ${node.label} is publicly accessible but does not have TLS enabled`,
            affectedNodeIds: [node.id],
            affectedLinkIds: [],
            category: 'misconfiguration',
            remediation: 'Enable TLS/HTTPS for public-facing services',
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Check for admin interfaces on guest networks
      if (node.role === 'admin' || node.tags.includes('admin')) {
        const guestLinks = graph.links.filter(
          (l: any) =>
            (l.source === node.id || l.target === node.id) &&
            (graph.nodes.find((n: any) => n.id === l.source)?.tags.includes('guest') ||
              graph.nodes.find((n: any) => n.id === l.target)?.tags.includes('guest'))
        );

        if (guestLinks.length > 0) {
          findings.push({
            id: randomUUID(),
            severity: 'critical',
            title: 'Admin Interface Accessible from Guest Network',
            description: `Admin node ${node.label} is accessible from guest network`,
            affectedNodeIds: [node.id],
            affectedLinkIds: guestLinks.map((l: any) => l.id),
            category: 'access-control',
            remediation: 'Implement network segmentation to isolate admin interfaces from guest networks',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  private buildMetrics(graph: Graph): Metrics {
    const reachabilityMatrix = buildReachabilityMatrix(graph);
    const latencyMatrix = buildLatencyMatrix(graph);

    // Convert to record format
    const reachability: Record<string, Record<string, boolean>> = {};
    for (const [source, targets] of reachabilityMatrix.entries()) {
      reachability[source] = {};
      for (const [target, reachable] of targets.entries()) {
        reachability[source][target] = reachable;
      }
    }

    const latency: Record<string, Record<string, number>> = {};
    for (const [source, targets] of latencyMatrix.entries()) {
      latency[source] = {};
      for (const [target, lat] of targets.entries()) {
        latency[source][target] = lat;
      }
    }

    return {
      reachabilityMatrix: reachability,
      latencyMatrix: latency,
      packetsProcessed: this.packetsProcessed,
      packetsDropped: this.packetsDropped,
      policiesEvaluated: this.policiesEvaluated,
      policiesBlocked: this.policiesBlocked,
    };
  }

  private addEvent(event: Omit<SimEvent, 'timestamp'> & { timestamp?: number }): void {
    this.events.push({
      timestamp: event.timestamp ?? this.currentTime,
      type: event.type,
      nodeId: event.nodeId,
      linkId: event.linkId,
      flowId: event.flowId,
      message: event.message,
      metadata: event.metadata,
    });
  }
}

export { validateGraph, findPath, buildReachabilityMatrix, buildLatencyMatrix };
