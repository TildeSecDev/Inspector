import { describe, it, expect } from 'vitest';
import { PolicyParser, PolicyEvaluator, PolicyValidator } from '../src/policy';

describe('PolicyParser', () => {
  it('should parse simple allow rule', () => {
    const parser = new PolicyParser();
    const ast = parser.parse('allow tcp from Users to WebApp port 443');
    
    expect(ast.rules).toHaveLength(1);
    expect(ast.rules[0].action).toBe('allow');
    expect(ast.rules[0].protocol).toBe('tcp');
    expect(ast.rules[0].from).toBe('Users');
    expect(ast.rules[0].to).toBe('WebApp');
    expect(ast.rules[0].port).toBe(443);
  });

  it('should parse deny rule without port', () => {
    const parser = new PolicyParser();
    const ast = parser.parse('deny any from Guests to Internal');
    
    expect(ast.rules).toHaveLength(1);
    expect(ast.rules[0].action).toBe('deny');
    expect(ast.rules[0].protocol).toBe('any');
    expect(ast.rules[0].from).toBe('Guests');
    expect(ast.rules[0].to).toBe('Internal');
    expect(ast.rules[0].port).toBeUndefined();
  });

  it('should parse multiple rules', () => {
    const parser = new PolicyParser();
    const dsl = `
allow tcp from Users to WebApp port 443
deny any from Guests to Internal
allow dns from Any to DNS
    `;
    const ast = parser.parse(dsl);
    
    expect(ast.rules).toHaveLength(3);
  });
});

describe('PolicyEvaluator', () => {
  it('should allow matching rule', () => {
    const parser = new PolicyParser();
    const ast = parser.parse('allow tcp from node-1 to node-2 port 443');
    const evaluator = new PolicyEvaluator(ast);

    const result = evaluator.evaluate({
      sourceNodeId: 'node-1',
      destNodeId: 'node-2',
      protocol: 'tcp',
      port: 443,
      nodeTagsMap: new Map([
        ['node-1', []],
        ['node-2', []],
      ]),
    });

    expect(result.allowed).toBe(true);
  });

  it('should deny non-matching rule', () => {
    const parser = new PolicyParser();
    const ast = parser.parse('deny tcp from node-1 to node-2 port 22');
    const evaluator = new PolicyEvaluator(ast);

    const result = evaluator.evaluate({
      sourceNodeId: 'node-1',
      destNodeId: 'node-2',
      protocol: 'tcp',
      port: 22,
      nodeTagsMap: new Map([
        ['node-1', []],
        ['node-2', []],
      ]),
    });

    expect(result.allowed).toBe(false);
  });

  it('should match tag-based rules', () => {
    const parser = new PolicyParser();
    const ast = parser.parse('allow tcp from Users to Servers port 443');
    const evaluator = new PolicyEvaluator(ast);

    const result = evaluator.evaluate({
      sourceNodeId: 'node-1',
      destNodeId: 'node-2',
      protocol: 'tcp',
      port: 443,
      nodeTagsMap: new Map([
        ['node-1', ['Users']],
        ['node-2', ['Servers']],
      ]),
    });

    expect(result.allowed).toBe(true);
  });
});
