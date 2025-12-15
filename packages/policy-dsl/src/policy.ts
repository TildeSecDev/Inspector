import { z } from 'zod';

export const PolicyActionSchema = z.enum(['allow', 'deny']);
export type PolicyAction = z.infer<typeof PolicyActionSchema>;

export const PolicyRuleSchema = z.object({
  action: PolicyActionSchema,
  protocol: z.string().optional(), // tcp, udp, icmp, any, dns
  from: z.string(), // node id, group, tag, or "any"
  to: z.string(), // node id, group, tag, or "any"
  port: z.union([z.number(), z.string()]).optional(), // port number or range
  comment: z.string().optional(),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export interface PolicyAST {
  rules: PolicyRule[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Simple DSL parser for firewall policies
 * Format: <action> <protocol?> from <source> to <destination> port <port?>
 * Examples:
 *   allow tcp from Users to WebApp port 443
 *   deny any from Guests to Internal
 *   allow dns from Any to DNS
 */
export class PolicyParser {
  parse(dsl: string): PolicyAST {
    const lines = dsl
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    const rules: PolicyRule[] = [];

    for (const line of lines) {
      const rule = this.parseLine(line);
      if (rule) {
        rules.push(rule);
      }
    }

    return { rules };
  }

  private parseLine(line: string): PolicyRule | null {
    // Match pattern: <action> [protocol] from <source> to <dest> [port <port>]
    const regex =
      /^(allow|deny)\s+(?:(tcp|udp|icmp|dns|any)\s+)?from\s+(\S+)\s+to\s+(\S+)(?:\s+port\s+(\S+))?/i;
    const match = line.match(regex);

    if (!match) {
      console.warn(`Failed to parse policy line: ${line}`);
      return null;
    }

    const [, action, protocol, from, to, port] = match;

    const rule: PolicyRule = {
      action: action.toLowerCase() as PolicyAction,
      from: from,
      to: to,
    };

    if (protocol) {
      rule.protocol = protocol.toLowerCase();
    }

    if (port) {
      // Try to parse as number, keep as string if it's a range
      const portNum = parseInt(port, 10);
      rule.port = isNaN(portNum) ? port : portNum;
    }

    return PolicyRuleSchema.parse(rule);
  }
}

/**
 * Validator for policy rules
 */
export class PolicyValidator {
  validate(ast: PolicyAST, availableNodes: Map<string, string[]>): ValidationResult {
    const errors: string[] = [];

    for (const rule of ast.rules) {
      // Validate source/destination references
      if (rule.from !== 'any' && rule.from !== 'Any' && !this.isValidNodeReference(rule.from, availableNodes)) {
        errors.push(`Invalid source reference: ${rule.from}`);
      }

      if (rule.to !== 'any' && rule.to !== 'Any' && !this.isValidNodeReference(rule.to, availableNodes)) {
        errors.push(`Invalid destination reference: ${rule.to}`);
      }

      // Validate protocol-port combinations
      if (rule.port && rule.protocol === 'icmp') {
        errors.push('ICMP protocol does not support port specification');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private isValidNodeReference(ref: string, availableNodes: Map<string, string[]>): boolean {
    // Check if it's a direct node ID
    if (availableNodes.has(ref)) {
      return true;
    }

    // Check if it's a tag reference
    for (const tags of availableNodes.values()) {
      if (tags.includes(ref)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * Policy evaluator for simulation
 */
export interface EvaluationContext {
  sourceNodeId: string;
  destNodeId: string;
  protocol?: string;
  port?: number;
  nodeTagsMap: Map<string, string[]>; // nodeId -> tags
}

export interface EvaluationResult {
  allowed: boolean;
  matchedRule?: PolicyRule;
  reason: string;
}

export class PolicyEvaluator {
  private ast: PolicyAST;

  constructor(ast: PolicyAST) {
    this.ast = ast;
  }

  evaluate(context: EvaluationContext): EvaluationResult {
    // Default deny if no rules match
    let result: EvaluationResult = {
      allowed: false,
      reason: 'No matching policy rule (default deny)',
    };

    // Evaluate rules in order (first match wins)
    for (const rule of this.ast.rules) {
      if (this.ruleMatches(rule, context)) {
        result = {
          allowed: rule.action === 'allow',
          matchedRule: rule,
          reason: `Matched rule: ${rule.action} from ${rule.from} to ${rule.to}`,
        };
        break; // First match wins
      }
    }

    return result;
  }

  private ruleMatches(rule: PolicyRule, context: EvaluationContext): boolean {
    // Check source match
    if (!this.nodeMatches(rule.from, context.sourceNodeId, context.nodeTagsMap)) {
      return false;
    }

    // Check destination match
    if (!this.nodeMatches(rule.to, context.destNodeId, context.nodeTagsMap)) {
      return false;
    }

    // Check protocol match
    if (rule.protocol && rule.protocol !== 'any') {
      if (!context.protocol || context.protocol !== rule.protocol) {
        return false;
      }
    }

    // Check port match
    if (rule.port !== undefined) {
      if (context.port === undefined) {
        return false;
      }

      if (typeof rule.port === 'number') {
        if (context.port !== rule.port) {
          return false;
        }
      } else {
        // Handle port ranges (e.g., "80-443")
        if (!this.portInRange(context.port, rule.port)) {
          return false;
        }
      }
    }

    return true;
  }

  private nodeMatches(ruleRef: string, nodeId: string, nodeTagsMap: Map<string, string[]>): boolean {
    // Match "any"
    if (ruleRef.toLowerCase() === 'any') {
      return true;
    }

    // Match exact node ID
    if (ruleRef === nodeId) {
      return true;
    }

    // Match by tag
    const tags = nodeTagsMap.get(nodeId) || [];
    if (tags.includes(ruleRef)) {
      return true;
    }

    return false;
  }

  private portInRange(port: number, rangeStr: string): boolean {
    const parts = rangeStr.split('-');
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      return port >= start && port <= end;
    }
    return port === parseInt(rangeStr, 10);
  }
}
