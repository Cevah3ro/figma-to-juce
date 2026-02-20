import { describe, it, expect } from 'vitest';
import { generatePathDraw, svgToJucePath, parseSvgPath } from '../../src/codegen/path.js';
import type { IRVectorNode, IRPathData } from '../../src/ir/types.js';

function makeVectorNode(overrides: Partial<IRVectorNode> = {}): IRVectorNode {
  return {
    id: 'v:1',
    name: 'TestVector',
    type: 'vector',
    visible: true,
    opacity: 1,
    bounds: { x: 0, y: 0, width: 24, height: 24 },
    relativeX: 0,
    relativeY: 0,
    fills: [],
    strokes: [],
    effects: [],
    blendMode: 'NORMAL',
    paths: [],
    ...overrides,
  };
}

// ─── parseSvgPath ───────────────────────────────────────────────────────────

describe('parseSvgPath', () => {
  it('parses M and L commands', () => {
    const cmds = parseSvgPath('M 0 12 L 24 12');
    expect(cmds).toHaveLength(2);
    expect(cmds[0]).toEqual({ type: 'M', args: [0, 12] });
    expect(cmds[1]).toEqual({ type: 'L', args: [24, 12] });
  });

  it('parses Z command', () => {
    const cmds = parseSvgPath('M 0 0 L 10 0 L 10 10 Z');
    expect(cmds).toHaveLength(4);
    expect(cmds[3]).toEqual({ type: 'Z', args: [] });
  });

  it('parses cubic bezier (C)', () => {
    const cmds = parseSvgPath('M 0 0 C 1 2 3 4 5 6');
    expect(cmds).toHaveLength(2);
    expect(cmds[1]).toEqual({ type: 'C', args: [1, 2, 3, 4, 5, 6] });
  });

  it('parses quadratic bezier (Q)', () => {
    const cmds = parseSvgPath('M 0 0 Q 5 10 10 0');
    expect(cmds).toHaveLength(2);
    expect(cmds[1]).toEqual({ type: 'Q', args: [5, 10, 10, 0] });
  });

  it('parses H and V commands', () => {
    const cmds = parseSvgPath('M 0 0 H 10 V 20');
    expect(cmds).toHaveLength(3);
    expect(cmds[1]).toEqual({ type: 'H', args: [10] });
    expect(cmds[2]).toEqual({ type: 'V', args: [20] });
  });

  it('parses negative numbers', () => {
    const cmds = parseSvgPath('M -5 -10 L -20 30');
    expect(cmds).toHaveLength(2);
    expect(cmds[0].args).toEqual([-5, -10]);
    expect(cmds[1].args).toEqual([-20, 30]);
  });

  it('parses lowercase relative commands', () => {
    const cmds = parseSvgPath('m 0 0 l 10 20');
    expect(cmds).toHaveLength(2);
    expect(cmds[0].type).toBe('m');
    expect(cmds[1].type).toBe('l');
  });

  it('splits implicit repeated commands', () => {
    const cmds = parseSvgPath('L 10 20 30 40');
    expect(cmds).toHaveLength(2);
    expect(cmds[0]).toEqual({ type: 'L', args: [10, 20] });
    expect(cmds[1]).toEqual({ type: 'L', args: [30, 40] });
  });

  it('handles decimal numbers', () => {
    const cmds = parseSvgPath('M 0.5 1.5 L 2.75 3.25');
    expect(cmds[0].args).toEqual([0.5, 1.5]);
    expect(cmds[1].args).toEqual([2.75, 3.25]);
  });
});

// ─── svgToJucePath ──────────────────────────────────────────────────────────

describe('svgToJucePath', () => {
  it('generates startNewSubPath for M command', () => {
    const pathData: IRPathData = { path: 'M 10 20', windingRule: 'nonzero' };
    const lines = svgToJucePath(pathData, 'p');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('p.startNewSubPath(10.0f, 20.0f)');
  });

  it('generates lineTo for L command', () => {
    const pathData: IRPathData = { path: 'M 0 0 L 10 20', windingRule: 'nonzero' };
    const lines = svgToJucePath(pathData, 'p');

    expect(lines[1]).toContain('p.lineTo(10.0f, 20.0f)');
  });

  it('generates closeSubPath for Z command', () => {
    const pathData: IRPathData = { path: 'M 0 0 L 10 0 L 10 10 Z', windingRule: 'nonzero' };
    const lines = svgToJucePath(pathData, 'p');

    expect(lines[lines.length - 1]).toContain('p.closeSubPath()');
  });

  it('generates cubicTo for C command', () => {
    const pathData: IRPathData = { path: 'M 0 0 C 1 2 3 4 5 6', windingRule: 'nonzero' };
    const lines = svgToJucePath(pathData, 'p');

    expect(lines[1]).toContain('p.cubicTo');
    expect(lines[1]).toContain('1.0f');
    expect(lines[1]).toContain('6.0f');
  });

  it('generates quadraticTo for Q command', () => {
    const pathData: IRPathData = { path: 'M 0 0 Q 5 10 10 0', windingRule: 'nonzero' };
    const lines = svgToJucePath(pathData, 'p');

    expect(lines[1]).toContain('p.quadraticTo');
  });

  it('handles H command (horizontal line)', () => {
    const pathData: IRPathData = { path: 'M 0 5 H 10', windingRule: 'nonzero' };
    const lines = svgToJucePath(pathData, 'p');

    expect(lines[1]).toContain('p.lineTo(10.0f, 5.0f)');
  });

  it('handles V command (vertical line)', () => {
    const pathData: IRPathData = { path: 'M 5 0 V 10', windingRule: 'nonzero' };
    const lines = svgToJucePath(pathData, 'p');

    expect(lines[1]).toContain('p.lineTo(5.0f, 10.0f)');
  });

  it('handles relative m/l commands', () => {
    const pathData: IRPathData = { path: 'm 10 20 l 5 5', windingRule: 'nonzero' };
    const lines = svgToJucePath(pathData, 'p');

    // m 10 20 → startNewSubPath(10, 20)
    expect(lines[0]).toContain('p.startNewSubPath(10.0f, 20.0f)');
    // l 5 5 → lineTo(10+5, 20+5) = lineTo(15, 25)
    expect(lines[1]).toContain('p.lineTo(15.0f, 25.0f)');
  });
});

// ─── generatePathDraw ───────────────────────────────────────────────────────

describe('generatePathDraw', () => {
  it('generates path draw code for vector with fill', () => {
    const node = makeVectorNode({
      paths: [{ path: 'M 0 0 L 24 0 L 24 24 Z', windingRule: 'nonzero' }],
      fills: [{ type: 'solid', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
    });
    const lines = generatePathDraw(node, 'bounds');
    const code = lines.join('\n');

    expect(code).toContain('juce::Path path;');
    expect(code).toContain('path.startNewSubPath');
    expect(code).toContain('path.lineTo');
    expect(code).toContain('path.closeSubPath');
    expect(code).toContain('g.fillPath(path)');
  });

  it('sets evenodd winding rule', () => {
    const node = makeVectorNode({
      paths: [{ path: 'M 0 0 L 10 0 Z', windingRule: 'evenodd' }],
      fills: [{ type: 'solid', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
    });
    const lines = generatePathDraw(node, 'bounds');
    const code = lines.join('\n');

    expect(code).toContain('setUsingNonZeroWinding(false)');
  });

  it('generates strokePath for stroked vectors', () => {
    const node = makeVectorNode({
      paths: [{ path: 'M 0 0 L 24 24', windingRule: 'nonzero' }],
      strokes: [{
        color: { r: 1, g: 1, b: 1, a: 1 },
        weight: 2,
        align: 'center',
        cap: 'none',
        join: 'miter',
        dashes: [],
        opacity: 1,
        visible: true,
      }],
    });
    const lines = generatePathDraw(node, 'bounds');
    const code = lines.join('\n');

    expect(code).toContain('g.strokePath');
    expect(code).toContain('PathStrokeType');
    expect(code).toContain('2.0f');
  });

  it('generates multiple paths with indexed names', () => {
    const node = makeVectorNode({
      paths: [
        { path: 'M 0 0 L 10 10', windingRule: 'nonzero' },
        { path: 'M 5 5 L 15 15', windingRule: 'nonzero' },
      ],
      fills: [{ type: 'solid', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
    });
    const lines = generatePathDraw(node, 'bounds');
    const code = lines.join('\n');

    expect(code).toContain('juce::Path path0;');
    expect(code).toContain('juce::Path path1;');
  });

  it('generates nothing for empty paths', () => {
    const node = makeVectorNode({ paths: [] });
    const lines = generatePathDraw(node, 'bounds');
    expect(lines).toHaveLength(0);
  });
});
