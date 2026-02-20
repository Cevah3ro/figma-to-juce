// Generate juce::Colour and juce::ColourGradient C++ code from IR fills.

import type {
  IRColor,
  IRFill,
  IRSolidFill,
  IRLinearGradientFill,
  IRRadialGradientFill,
} from '../ir/types.js';

// ─── Colour Primitives ──────────────────────────────────────────────────────

/**
 * Convert an IR color (0-1 range) to a JUCE hex string like "0xff1a2b3c".
 */
export function colourToHex(color: IRColor): string {
  const r = Math.round(clamp01(color.r) * 255);
  const g = Math.round(clamp01(color.g) * 255);
  const b = Math.round(clamp01(color.b) * 255);
  const a = Math.round(clamp01(color.a) * 255);
  return `0x${hex2(a)}${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/**
 * Generate a juce::Colour(...) expression.
 */
export function generateColour(color: IRColor): string {
  return `juce::Colour(${colourToHex(color)})`;
}

/**
 * Generate a juce::Colour expression with separate opacity applied.
 */
export function generateColourWithOpacity(color: IRColor, opacity: number): string {
  if (opacity >= 1) return generateColour(color);
  const rounded = Math.round(opacity * 1000) / 1000;
  return `${generateColour(color)}.withAlpha(${formatFloat(rounded)})`;
}

// ─── Fill Code Generation ───────────────────────────────────────────────────

/**
 * Generate the g.setColour() or g.setGradientFill() code for a fill.
 * Returns empty string for invisible or unsupported fills.
 */
export function generateFillCode(fill: IRFill, boundsVar: string): string {
  if (!fill.visible) return '';

  switch (fill.type) {
    case 'solid':
      return generateSolidFillCode(fill);
    case 'linearGradient':
      return generateLinearGradientCode(fill, boundsVar);
    case 'radialGradient':
      return generateRadialGradientCode(fill, boundsVar);
    case 'image':
      return `// TODO: Image fill (imageRef: ${fill.imageRef})\n`;
  }
}

function generateSolidFillCode(fill: IRSolidFill): string {
  return `g.setColour(${generateColourWithOpacity(fill.color, fill.opacity)});\n`;
}

function generateLinearGradientCode(fill: IRLinearGradientFill, boundsVar: string): string {
  if (fill.stops.length < 2) return '';

  const lines: string[] = [];
  const first = fill.stops[0];
  const last = fill.stops[fill.stops.length - 1];

  const sx = `${boundsVar}.getX() + ${boundsVar}.getWidth() * ${formatFloat(fill.start.x)}`;
  const sy = `${boundsVar}.getY() + ${boundsVar}.getHeight() * ${formatFloat(fill.start.y)}`;
  const ex = `${boundsVar}.getX() + ${boundsVar}.getWidth() * ${formatFloat(fill.end.x)}`;
  const ey = `${boundsVar}.getY() + ${boundsVar}.getHeight() * ${formatFloat(fill.end.y)}`;

  lines.push(`juce::ColourGradient gradient(${generateColour(first.color)}, ${sx}, ${sy},`);
  lines.push(`                             ${generateColour(last.color)}, ${ex}, ${ey}, false);`);

  for (let i = 1; i < fill.stops.length - 1; i++) {
    const stop = fill.stops[i];
    lines.push(`gradient.addColour(${formatFloat(stop.position)}, ${generateColour(stop.color)});`);
  }

  if (fill.opacity < 1) {
    lines.push(`gradient.multiplyOpacity(${formatFloat(fill.opacity)});`);
  }

  lines.push(`g.setGradientFill(gradient);`);
  return lines.join('\n') + '\n';
}

function generateRadialGradientCode(fill: IRRadialGradientFill, boundsVar: string): string {
  if (fill.stops.length < 2) return '';

  const lines: string[] = [];
  const first = fill.stops[0];
  const last = fill.stops[fill.stops.length - 1];

  const cx = `${boundsVar}.getX() + ${boundsVar}.getWidth() * ${formatFloat(fill.center.x)}`;
  const cy = `${boundsVar}.getY() + ${boundsVar}.getHeight() * ${formatFloat(fill.center.y)}`;
  const edgeX = `${boundsVar}.getX() + ${boundsVar}.getWidth() * ${formatFloat(fill.center.x + fill.radius.x)}`;
  const edgeY = `${boundsVar}.getY() + ${boundsVar}.getHeight() * ${formatFloat(fill.center.y)}`;

  lines.push(`juce::ColourGradient gradient(${generateColour(first.color)}, ${cx}, ${cy},`);
  lines.push(`                             ${generateColour(last.color)}, ${edgeX}, ${edgeY}, true);`);

  for (let i = 1; i < fill.stops.length - 1; i++) {
    const stop = fill.stops[i];
    lines.push(`gradient.addColour(${formatFloat(stop.position)}, ${generateColour(stop.color)});`);
  }

  if (fill.opacity < 1) {
    lines.push(`gradient.multiplyOpacity(${formatFloat(fill.opacity)});`);
  }

  lines.push(`g.setGradientFill(gradient);`);
  return lines.join('\n') + '\n';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}

function hex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

function formatFloat(v: number): string {
  if (Number.isInteger(v)) return v.toFixed(1) + 'f';
  const rounded = Math.round(v * 10000) / 10000;
  return String(rounded) + 'f';
}
