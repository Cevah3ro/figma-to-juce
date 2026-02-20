// Generate juce::Path code from IR vector nodes (SVG path data → JUCE Path commands).

import type { IRVectorNode, IRPathData } from '../ir/types.js';
import { generateFillCode, generateColourWithOpacity } from './colour.js';
import { toFloat } from '../utils/math.js';

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate C++ lines to draw a vector node's paths.
 */
export function generatePathDraw(node: IRVectorNode, boundsExpr: string): string[] {
  const lines: string[] = [];

  for (let i = 0; i < node.paths.length; i++) {
    const pathData = node.paths[i];
    const varName = node.paths.length === 1 ? 'path' : `path${i}`;

    lines.push(`{`);

    // Build the path
    lines.push(`    juce::Path ${varName};`);
    lines.push(...svgToJucePath(pathData, varName).map(l => `    ${l}`));

    // Set winding rule
    if (pathData.windingRule === 'evenodd') {
      lines.push(`    ${varName}.setUsingNonZeroWinding(false);`);
    }

    // Apply fills
    for (const fill of node.fills) {
      if (!fill.visible) continue;
      const fillCode = generateFillCode(fill, boundsExpr);
      if (!fillCode) continue;
      lines.push(`    ${fillCode.trimEnd()}`);
      lines.push(`    g.fillPath(${varName});`);
    }

    // Apply strokes
    for (const stroke of node.strokes) {
      if (!stroke.visible) continue;
      lines.push(`    g.setColour(${generateColourExprForStroke(stroke)});`);
      lines.push(`    g.strokePath(${varName}, juce::PathStrokeType(${toFloat(stroke.weight)}));`);
    }

    lines.push(`}`);
  }

  return lines;
}

// ─── SVG Path → JUCE Path ───────────────────────────────────────────────────

/**
 * Convert an SVG path string to juce::Path method calls.
 * Supports: M, L, C, Q, Z (and lowercase relative variants).
 */
export function svgToJucePath(pathData: IRPathData, varName: string): string[] {
  const lines: string[] = [];
  const commands = parseSvgPath(pathData.path);

  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        lines.push(`${varName}.startNewSubPath(${toFloat(cmd.args[0])}, ${toFloat(cmd.args[1])});`);
        currentX = cmd.args[0];
        currentY = cmd.args[1];
        break;
      case 'm': {
        const mx = currentX + cmd.args[0];
        const my = currentY + cmd.args[1];
        lines.push(`${varName}.startNewSubPath(${toFloat(mx)}, ${toFloat(my)});`);
        currentX = mx;
        currentY = my;
        break;
      }
      case 'L':
        lines.push(`${varName}.lineTo(${toFloat(cmd.args[0])}, ${toFloat(cmd.args[1])});`);
        currentX = cmd.args[0];
        currentY = cmd.args[1];
        break;
      case 'l': {
        const lx = currentX + cmd.args[0];
        const ly = currentY + cmd.args[1];
        lines.push(`${varName}.lineTo(${toFloat(lx)}, ${toFloat(ly)});`);
        currentX = lx;
        currentY = ly;
        break;
      }
      case 'H':
        lines.push(`${varName}.lineTo(${toFloat(cmd.args[0])}, ${toFloat(currentY)});`);
        currentX = cmd.args[0];
        break;
      case 'h': {
        const hx = currentX + cmd.args[0];
        lines.push(`${varName}.lineTo(${toFloat(hx)}, ${toFloat(currentY)});`);
        currentX = hx;
        break;
      }
      case 'V':
        lines.push(`${varName}.lineTo(${toFloat(currentX)}, ${toFloat(cmd.args[0])});`);
        currentY = cmd.args[0];
        break;
      case 'v': {
        const vy = currentY + cmd.args[0];
        lines.push(`${varName}.lineTo(${toFloat(currentX)}, ${toFloat(vy)});`);
        currentY = vy;
        break;
      }
      case 'C':
        lines.push(
          `${varName}.cubicTo(${toFloat(cmd.args[0])}, ${toFloat(cmd.args[1])}, ${toFloat(cmd.args[2])}, ${toFloat(cmd.args[3])}, ${toFloat(cmd.args[4])}, ${toFloat(cmd.args[5])});`,
        );
        currentX = cmd.args[4];
        currentY = cmd.args[5];
        break;
      case 'c': {
        const cx1 = currentX + cmd.args[0];
        const cy1 = currentY + cmd.args[1];
        const cx2 = currentX + cmd.args[2];
        const cy2 = currentY + cmd.args[3];
        const cex = currentX + cmd.args[4];
        const cey = currentY + cmd.args[5];
        lines.push(
          `${varName}.cubicTo(${toFloat(cx1)}, ${toFloat(cy1)}, ${toFloat(cx2)}, ${toFloat(cy2)}, ${toFloat(cex)}, ${toFloat(cey)});`,
        );
        currentX = cex;
        currentY = cey;
        break;
      }
      case 'Q':
        lines.push(
          `${varName}.quadraticTo(${toFloat(cmd.args[0])}, ${toFloat(cmd.args[1])}, ${toFloat(cmd.args[2])}, ${toFloat(cmd.args[3])});`,
        );
        currentX = cmd.args[2];
        currentY = cmd.args[3];
        break;
      case 'q': {
        const qx1 = currentX + cmd.args[0];
        const qy1 = currentY + cmd.args[1];
        const qex = currentX + cmd.args[2];
        const qey = currentY + cmd.args[3];
        lines.push(
          `${varName}.quadraticTo(${toFloat(qx1)}, ${toFloat(qy1)}, ${toFloat(qex)}, ${toFloat(qey)});`,
        );
        currentX = qex;
        currentY = qey;
        break;
      }
      case 'Z':
      case 'z':
        lines.push(`${varName}.closeSubPath();`);
        break;
    }
  }

  return lines;
}

// ─── SVG Path Parser ────────────────────────────────────────────────────────

interface SvgCommand {
  type: string;
  args: number[];
}

/**
 * Parse an SVG path string into a list of commands with numeric arguments.
 */
export function parseSvgPath(d: string): SvgCommand[] {
  const commands: SvgCommand[] = [];
  // Match command letter followed by optional numbers (including negatives and decimals)
  const regex = /([MmLlHhVvCcQqSsTtAaZz])([^MmLlHhVvCcQqSsTtAaZz]*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(d)) !== null) {
    const type = match[1];
    const argStr = match[2].trim();

    if (type === 'Z' || type === 'z') {
      commands.push({ type, args: [] });
      continue;
    }

    const args = parseNumbers(argStr);
    const expectedArgs = getExpectedArgCount(type);

    if (expectedArgs === 0 || args.length <= expectedArgs) {
      commands.push({ type, args });
    } else {
      // Split implicit repeated commands (e.g., "L 1 2 3 4" → two L commands)
      for (let i = 0; i < args.length; i += expectedArgs) {
        commands.push({ type, args: args.slice(i, i + expectedArgs) });
      }
    }
  }

  return commands;
}

function parseNumbers(str: string): number[] {
  if (!str) return [];
  const matches = str.match(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi);
  return matches ? matches.map(Number) : [];
}

function getExpectedArgCount(type: string): number {
  switch (type.toUpperCase()) {
    case 'M': case 'L': case 'T': return 2;
    case 'H': case 'V': return 1;
    case 'C': return 6;
    case 'S': case 'Q': return 4;
    case 'A': return 7;
    default: return 0;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateColourExprForStroke(stroke: { color: { r: number; g: number; b: number; a: number }; opacity: number }): string {
  return generateColourWithOpacity(stroke.color, stroke.opacity);
}
