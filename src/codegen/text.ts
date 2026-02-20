// Generate JUCE text drawing code from IR text nodes.

import type { IRTextNode, IRTextStyle } from '../ir/types.js';
import { generateColourWithOpacity } from './colour.js';
import { toFloat, toInt } from '../utils/math.js';

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate C++ lines to draw a text node (font setup + drawText/drawFittedText).
 */
export function generateTextDraw(node: IRTextNode, boundsExpr: string): string[] {
  const lines: string[] = [];
  const style = node.textStyle;

  // Font setup
  lines.push(...generateFontSetup(style));

  // Colour
  lines.push(`g.setColour(${generateColourWithOpacity(style.color, 1.0)});`);

  // Draw
  const text = escapeCppString(node.characters);
  const justification = mapJustification(style.textAlignHorizontal, style.textAlignVertical);

  if (node.autoResize === 'truncate' || node.autoResize === 'none') {
    // Fixed-size text: drawFittedText with max lines
    const maxLines = estimateMaxLines(node);
    lines.push(
      `g.drawFittedText("${text}", ${boundsExpr}.toNearestInt(), ${justification}, ${maxLines});`,
    );
  } else {
    // Auto-sized: simple drawText
    lines.push(
      `g.drawText("${text}", ${boundsExpr}, ${justification}, true);`,
    );
  }

  return lines;
}

// ─── Font Setup ─────────────────────────────────────────────────────────────

function generateFontSetup(style: IRTextStyle): string[] {
  const lines: string[] = [];
  const fontExpr = buildFontExpression(style);
  lines.push(`g.setFont(${fontExpr});`);
  return lines;
}

/**
 * Build a juce::Font(...) expression from text style.
 */
export function buildFontExpression(style: IRTextStyle): string {
  const parts: string[] = [];

  // Font family + size
  parts.push(`juce::Font(juce::FontOptions(${toFloat(style.fontSize)}))`);

  // Bold
  if (style.fontWeight >= 700) {
    parts.push(`.boldened()`);
  }

  // Italic
  if (style.italic) {
    parts.push(`.italicised()`);
  }

  return parts.join('');
}

// ─── Justification Mapping ──────────────────────────────────────────────────

export function mapJustification(
  horizontal: IRTextStyle['textAlignHorizontal'],
  vertical: IRTextStyle['textAlignVertical'],
): string {
  const h = mapHorizontalAlign(horizontal);
  const v = mapVerticalAlign(vertical);

  // JUCE Justification combines horizontal and vertical via |
  if (v === 'verticallyCentred') {
    if (h === 'left') return 'juce::Justification::centredLeft';
    if (h === 'right') return 'juce::Justification::centredRight';
    return 'juce::Justification::centred';
  }

  if (v === 'top') {
    if (h === 'left') return 'juce::Justification::topLeft';
    if (h === 'right') return 'juce::Justification::topRight';
    return 'juce::Justification::centredTop';
  }

  // bottom
  if (h === 'left') return 'juce::Justification::bottomLeft';
  if (h === 'right') return 'juce::Justification::bottomRight';
  return 'juce::Justification::centredBottom';
}

function mapHorizontalAlign(align: IRTextStyle['textAlignHorizontal']): string {
  switch (align) {
    case 'left': return 'left';
    case 'right': return 'right';
    case 'center': return 'horizontallyCentred';
    case 'justified': return 'left'; // JUCE doesn't have justified in Justification
  }
}

function mapVerticalAlign(align: IRTextStyle['textAlignVertical']): string {
  switch (align) {
    case 'top': return 'top';
    case 'bottom': return 'bottom';
    case 'center': return 'verticallyCentred';
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function estimateMaxLines(node: IRTextNode): number {
  if (node.textStyle.lineHeight > 0) {
    return Math.max(1, Math.floor(node.bounds.height / node.textStyle.lineHeight));
  }
  // Fallback: estimate from fontSize
  return Math.max(1, Math.floor(node.bounds.height / (node.textStyle.fontSize * 1.2)));
}

function escapeCppString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
