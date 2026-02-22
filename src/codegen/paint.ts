// Generate the paint() method body for a JUCE Component from IR nodes.

import type {
  IRNode,
  IRFrameNode,
  IRRectangleNode,
  IREllipseNode,
  IRTextNode,
  IRVectorNode,
  IRGroupNode,
  IRFill,
  IRStroke,
  IRDropShadow,
  IRCornerRadius,
} from '../ir/types.js';
import {
  isIRFrameNode,
  isIRGroupNode,
  isIRRectangleNode,
  isIREllipseNode,
  isIRTextNode,
  isIRVectorNode,
} from '../ir/types.js';
import { generateFillCode, generateColourWithOpacity, generateColour } from './colour.js';
import { generateTextDraw } from './text.js';
import { generatePathDraw } from './path.js';
import { toFloat } from '../utils/math.js';

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate the full paint() method body for a component's IR tree.
 * Returns lines of C++ code (without the method signature/braces).
 */
export function generatePaintBody(root: IRFrameNode): string {
  const lines: string[] = [];

  // Draw the root frame's own background
  lines.push(...generateNodePaint(root, 'getLocalBounds().toFloat()'));

  // Draw children recursively
  for (const child of root.children) {
    lines.push(...generateChildPaint(child));
  }

  return lines.join('\n');
}

// ─── Per-node Paint Generation ──────────────────────────────────────────────

function generateChildPaint(node: IRNode): string[] {
  if (!node.visible) return [];

  const lines: string[] = [];
  const boundsExpr = nodeBoundsExpr(node);

  // Apply opacity via saveState/restoreState if needed
  const needsOpacity = node.opacity < 1;
  if (needsOpacity) {
    lines.push(`g.saveState();`);
    lines.push(`g.reduceClipRegion(${boundsExpr}.toNearestInt());`);
    lines.push(`g.setOpacity(${toFloat(node.opacity)});`);
  }

  // Drop shadows (must paint before the shape)
  lines.push(...generateDropShadows(node));

  // Node-specific drawing
  lines.push(...generateNodePaint(node, boundsExpr));

  // Strokes
  lines.push(...generateStrokes(node, boundsExpr));

  // Recurse into children
  if (isIRFrameNode(node) || isIRGroupNode(node)) {
    for (const child of node.children) {
      lines.push(...generateChildPaint(child));
    }
  }

  if (needsOpacity) {
    lines.push(`g.restoreState();`);
  }

  return lines;
}

function generateNodePaint(node: IRNode, boundsExpr: string): string[] {
  const lines: string[] = [];

  if (isIRRectangleNode(node) || isIRFrameNode(node)) {
    lines.push(...generateRectPaint(node, boundsExpr));
  } else if (isIREllipseNode(node)) {
    lines.push(...generateEllipsePaint(node, boundsExpr));
  } else if (isIRTextNode(node)) {
    lines.push(...generateTextDraw(node, boundsExpr));
  } else if (isIRVectorNode(node)) {
    lines.push(...generatePathDraw(node, boundsExpr));
  }

  return lines;
}

// ─── Rectangle / Frame fill ────────────────────────────────────────────────

function generateRectPaint(
  node: IRRectangleNode | IRFrameNode,
  boundsExpr: string,
): string[] {
  const lines: string[] = [];

  for (const fill of node.fills) {
    if (!fill.visible) continue;

    const fillCode = generateFillCode(fill, boundsExpr);
    if (!fillCode) continue;

    lines.push(fillCode.trimEnd());

    const cr = node.cornerRadius;
    if (hasRounding(cr)) {
      if (cr.isUniform) {
        lines.push(`g.fillRoundedRectangle(${boundsExpr}, ${toFloat(cr.topLeft)});`);
      } else {
        // JUCE doesn't have direct per-corner rounding — use a Path
        lines.push(...perCornerRoundedRect(boundsExpr, cr));
      }
    } else {
      lines.push(`g.fillRect(${boundsExpr});`);
    }
  }

  return lines;
}

function perCornerRoundedRect(boundsExpr: string, cr: IRCornerRadius): string[] {
  // JUCE signature: addRoundedRectangle(x, y, w, h, cornerSizeX, cornerSizeY,
  //   curveTopLeft, curveTopRight, curveBottomLeft, curveBottomRight)
  // cornerSize is the max radius; booleans enable/disable each corner.
  // For truly different radii per corner, we approximate with the max and use a custom path.
  const maxR = Math.max(cr.topLeft, cr.topRight, cr.bottomLeft, cr.bottomRight);
  const allSame = cr.topLeft === cr.topRight && cr.topRight === cr.bottomLeft && cr.bottomLeft === cr.bottomRight;

  if (allSame || (cr.topLeft > 0 && cr.topRight > 0 && cr.bottomLeft > 0 && cr.bottomRight > 0 &&
      cr.topLeft === cr.topRight && cr.bottomLeft === cr.bottomRight && cr.topLeft === cr.bottomLeft)) {
    // All corners equal — use simple rounded rect
    return [`g.fillRoundedRectangle(${boundsExpr}, ${toFloat(cr.topLeft)});`];
  }

  return [
    `{`,
    `    auto rc = ${boundsExpr};`,
    `    juce::Path p;`,
    `    p.addRoundedRectangle(rc.getX(), rc.getY(), rc.getWidth(), rc.getHeight(),`,
    `                          ${toFloat(maxR)}, ${toFloat(maxR)},`,
    `                          ${cr.topLeft > 0 ? 'true' : 'false'}, ${cr.topRight > 0 ? 'true' : 'false'},`,
    `                          ${cr.bottomLeft > 0 ? 'true' : 'false'}, ${cr.bottomRight > 0 ? 'true' : 'false'});`,
    `    g.fillPath(p);`,
    `}`,
  ];
}

// ─── Ellipse fill ───────────────────────────────────────────────────────────

function generateEllipsePaint(node: IREllipseNode, boundsExpr: string): string[] {
  const lines: string[] = [];

  for (const fill of node.fills) {
    if (!fill.visible) continue;

    const fillCode = generateFillCode(fill, boundsExpr);
    if (!fillCode) continue;

    lines.push(fillCode.trimEnd());
    lines.push(`g.fillEllipse(${boundsExpr});`);
  }

  return lines;
}

// ─── Drop Shadows ───────────────────────────────────────────────────────────

function generateDropShadows(node: IRNode): string[] {
  const lines: string[] = [];

  for (const effect of node.effects) {
    if (effect.type !== 'dropShadow' || !effect.visible) continue;
    const shadow = effect as IRDropShadow;

    lines.push(`{`);
    lines.push(`    juce::DropShadow shadow(${generateColour(shadow.color)}, ${Math.round(shadow.radius)}, juce::Point<int>(${Math.round(shadow.offset.x)}, ${Math.round(shadow.offset.y)}));`);
    lines.push(`    shadow.drawForRectangle(g, ${nodeBoundsExpr(node)}.toNearestInt());`);
    lines.push(`}`);
  }

  return lines;
}

// ─── Strokes ────────────────────────────────────────────────────────────────

function generateStrokes(node: IRNode, boundsExpr: string): string[] {
  const lines: string[] = [];

  for (const stroke of node.strokes) {
    if (!stroke.visible) continue;

    lines.push(
      `g.setColour(${generateColourWithOpacity(stroke.color, stroke.opacity)});`,
    );

    if (isIREllipseNode(node)) {
      lines.push(`g.drawEllipse(${boundsExpr}, ${toFloat(stroke.weight)});`);
    } else if (
      (isIRRectangleNode(node) || isIRFrameNode(node)) &&
      hasRounding(node.cornerRadius)
    ) {
      lines.push(
        `g.drawRoundedRectangle(${boundsExpr}, ${toFloat(node.cornerRadius.topLeft)}, ${toFloat(stroke.weight)});`,
      );
    } else {
      lines.push(`g.drawRect(${boundsExpr}, ${toFloat(stroke.weight)});`);
    }
  }

  return lines;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function nodeBoundsExpr(node: IRNode): string {
  return `juce::Rectangle<float>(${toFloat(node.relativeX)}, ${toFloat(node.relativeY)}, ${toFloat(node.bounds.width)}, ${toFloat(node.bounds.height)})`;
}

function hasRounding(cr: IRCornerRadius): boolean {
  return cr.topLeft > 0 || cr.topRight > 0 || cr.bottomRight > 0 || cr.bottomLeft > 0;
}
