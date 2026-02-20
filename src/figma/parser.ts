// Parse Figma API JSON into IR nodes
// Converts the Figma REST API response tree into our normalized IR representation.

import type {
  FigmaNode,
  FigmaFileResponse,
  FigmaCanvasNode,
  FigmaFrameNode,
  FigmaGroupNode,
  FigmaRectangleNode,
  FigmaEllipseNode,
  FigmaTextNode,
  FigmaVectorNode,
  FigmaLineNode,
  FigmaBooleanOperationNode,
  FigmaComponentNode,
  FigmaInstanceNode,
  FigmaPaint,
  FigmaEffect,
  FigmaColor,
  FigmaSceneNodeBase,
  FigmaFrameMixin,
  FigmaCornerMixin,
  FigmaRect,
  FigmaTypeStyle,
  FigmaPathGeometry,
  FigmaColorStop,
} from './types.js';

import {
  hasChildren,
  isFrameNode,
  isGroupNode,
  isRectangleNode,
  isEllipseNode,
  isTextNode,
  isVectorNode,
  isLineNode,
  isBooleanOperationNode,
  isComponentNode,
  isInstanceNode,
  isCanvasNode,
  isDocumentNode,
  isFrameLike,
} from './types.js';

import type {
  IRNode,
  IRFrameNode,
  IRGroupNode,
  IRRectangleNode,
  IREllipseNode,
  IRTextNode,
  IRVectorNode,
  IRDocument,
  IRPage,
  IRColor,
  IRBounds,
  IRFill,
  IRSolidFill,
  IRLinearGradientFill,
  IRRadialGradientFill,
  IRImageFill,
  IRStroke,
  IREffect,
  IRDropShadow,
  IRInnerShadow,
  IRBlur,
  IRCornerRadius,
  IRTextStyle,
  IRAutoLayout,
  IRConstraints,
  IRPathData,
  IRNodeBase,
} from '../ir/types.js';

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Parse a full Figma file response into an IR document.
 */
export function parseFigmaFile(response: FigmaFileResponse): IRDocument {
  const pages: IRPage[] = [];

  for (const child of response.document.children) {
    if (isCanvasNode(child)) {
      pages.push(parseCanvasNode(child));
    }
  }

  return {
    name: response.name,
    pages,
  };
}

/**
 * Parse a single Figma node tree into IR nodes.
 * Useful when working with the nodes endpoint or a subtree.
 */
export function parseFigmaNode(node: FigmaNode): IRNode | null {
  return convertNode(node, null);
}

// ─── Canvas / Page ──────────────────────────────────────────────────────────

function parseCanvasNode(canvas: FigmaCanvasNode): IRPage {
  const children: IRNode[] = [];
  for (const child of canvas.children) {
    const irNode = convertNode(child, null);
    if (irNode) {
      children.push(irNode);
    }
  }

  return {
    id: canvas.id,
    name: canvas.name,
    backgroundColor: convertColor(canvas.backgroundColor),
    children,
  };
}

// ─── Node Conversion ────────────────────────────────────────────────────────

function convertNode(node: FigmaNode, parentBounds: FigmaRect | null): IRNode | null {
  // Skip invisible nodes (visible defaults to true when undefined)
  if (node.visible === false) {
    return null;
  }

  // Skip structural-only nodes
  if (isDocumentNode(node) || isCanvasNode(node)) {
    return null;
  }

  if (isFrameNode(node)) return convertFrameNode(node, 'frame', parentBounds);
  if (isComponentNode(node)) return convertFrameNode(node, 'component', parentBounds);
  if (isInstanceNode(node)) return convertInstanceNode(node, parentBounds);
  if (isGroupNode(node)) return convertGroupNode(node, parentBounds);
  if (isRectangleNode(node)) return convertRectangleNode(node, parentBounds);
  if (isEllipseNode(node)) return convertEllipseNode(node, parentBounds);
  if (isTextNode(node)) return convertTextNode(node, parentBounds);
  if (isVectorNode(node)) return convertVectorNode(node, parentBounds);
  if (isLineNode(node)) return convertLineNode(node, parentBounds);
  if (isBooleanOperationNode(node)) return convertBooleanOperationNode(node, parentBounds);

  // Unsupported node types (SECTION, COMPONENT_SET, SLICE, etc.) — skip
  return null;
}

// ─── Frame-like Nodes ───────────────────────────────────────────────────────

function convertFrameNode(
  node: FigmaFrameNode | FigmaComponentNode,
  type: 'frame' | 'component',
  parentBounds: FigmaRect | null,
): IRFrameNode {
  const bounds = extractBounds(node);
  const children = convertChildren(node, bounds);

  return {
    ...extractBaseProperties(node, parentBounds),
    type,
    children,
    cornerRadius: extractCornerRadius(node),
    clipsContent: node.clipsContent ?? true,
    autoLayout: extractAutoLayout(node),
  };
}

function convertInstanceNode(
  node: FigmaInstanceNode,
  parentBounds: FigmaRect | null,
): IRFrameNode {
  const bounds = extractBounds(node);
  const children = convertChildren(node, bounds);

  return {
    ...extractBaseProperties(node, parentBounds),
    type: 'instance',
    children,
    cornerRadius: extractCornerRadius(node),
    clipsContent: node.clipsContent ?? true,
    autoLayout: extractAutoLayout(node),
    componentId: node.componentId,
  };
}

function convertGroupNode(
  node: FigmaGroupNode,
  parentBounds: FigmaRect | null,
): IRGroupNode {
  const bounds = extractBounds(node);
  const children = convertChildren(node, bounds);

  return {
    ...extractBaseProperties(node, parentBounds),
    type: 'group',
    children,
  };
}

// ─── Shape Nodes ────────────────────────────────────────────────────────────

function convertRectangleNode(
  node: FigmaRectangleNode,
  parentBounds: FigmaRect | null,
): IRRectangleNode {
  return {
    ...extractBaseProperties(node, parentBounds),
    type: 'rectangle',
    cornerRadius: extractCornerRadius(node),
  };
}

function convertEllipseNode(
  node: FigmaEllipseNode,
  parentBounds: FigmaRect | null,
): IREllipseNode {
  return {
    ...extractBaseProperties(node, parentBounds),
    type: 'ellipse',
    arcStartAngle: node.arcData?.startingAngle,
    arcEndAngle: node.arcData?.endingAngle,
    innerRadius: node.arcData?.innerRadius,
  };
}

// ─── Text Node ──────────────────────────────────────────────────────────────

function convertTextNode(
  node: FigmaTextNode,
  parentBounds: FigmaRect | null,
): IRTextNode {
  return {
    ...extractBaseProperties(node, parentBounds),
    type: 'text',
    characters: node.characters,
    textStyle: extractTextStyle(node.style),
    autoResize: convertTextAutoResize(node.textAutoResize),
  };
}

// ─── Vector Nodes ───────────────────────────────────────────────────────────

function convertVectorNode(
  node: FigmaVectorNode,
  parentBounds: FigmaRect | null,
): IRVectorNode {
  return {
    ...extractBaseProperties(node, parentBounds),
    type: 'vector',
    paths: extractPaths(node.fillGeometry, node.strokeGeometry),
  };
}

function convertLineNode(
  node: FigmaLineNode,
  parentBounds: FigmaRect | null,
): IRVectorNode {
  return {
    ...extractBaseProperties(node, parentBounds),
    type: 'line',
    paths: extractPaths(undefined, node.strokeGeometry),
  };
}

function convertBooleanOperationNode(
  node: FigmaBooleanOperationNode,
  parentBounds: FigmaRect | null,
): IRVectorNode {
  return {
    ...extractBaseProperties(node, parentBounds),
    type: 'booleanOperation',
    paths: extractPaths(node.fillGeometry, node.strokeGeometry),
    booleanOperation: node.booleanOperation.toLowerCase() as IRVectorNode['booleanOperation'],
  };
}

// ─── Children Conversion ────────────────────────────────────────────────────

function convertChildren(
  node: FigmaNode & { children: FigmaNode[] },
  parentBounds: FigmaRect | null,
): IRNode[] {
  const children: IRNode[] = [];
  for (const child of node.children) {
    const irNode = convertNode(child, parentBounds);
    if (irNode) {
      children.push(irNode);
    }
  }
  return children;
}

// ─── Property Extraction ────────────────────────────────────────────────────

function extractBaseProperties(
  node: FigmaSceneNodeBase,
  parentBounds: FigmaRect | null,
): Omit<IRNodeBase, 'type'> {
  const bounds = extractBounds(node);
  const { relativeX, relativeY } = computeRelativePosition(bounds, parentBounds);

  const base: Omit<IRNodeBase, 'type'> = {
    id: node.id,
    name: node.name,
    visible: node.visible !== false,
    opacity: node.opacity ?? 1,
    bounds,
    relativeX,
    relativeY,
    fills: convertFills(node.fills),
    strokes: convertStrokes(node.strokes, node.strokeWeight, node.strokeAlign, node.strokeCap, node.strokeJoin),
    effects: convertEffects(node.effects),
    blendMode: node.blendMode ?? 'PASS_THROUGH',
  };

  // Auto-layout child properties
  const frameMixin = node as Partial<FigmaFrameMixin>;
  if (frameMixin.layoutAlign !== undefined) {
    base.layoutAlign = convertLayoutAlign(frameMixin.layoutAlign);
  }
  if (frameMixin.layoutGrow !== undefined) {
    base.layoutGrow = frameMixin.layoutGrow;
  }
  if (frameMixin.layoutPositioning !== undefined) {
    base.layoutPositioning = frameMixin.layoutPositioning === 'ABSOLUTE' ? 'absolute' : 'auto';
  }

  // Constraints
  if (node.constraints) {
    base.constraints = convertConstraints(node.constraints);
  }

  return base;
}

function extractBounds(node: FigmaSceneNodeBase): IRBounds {
  const box = node.absoluteBoundingBox;
  if (box) {
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
  }
  // Fallback to size if available
  if (node.size) {
    return {
      x: 0,
      y: 0,
      width: node.size.x,
      height: node.size.y,
    };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
}

function computeRelativePosition(
  bounds: IRBounds,
  parentBounds: FigmaRect | null,
): { relativeX: number; relativeY: number } {
  if (!parentBounds) {
    return { relativeX: 0, relativeY: 0 };
  }
  return {
    relativeX: bounds.x - parentBounds.x,
    relativeY: bounds.y - parentBounds.y,
  };
}

// ─── Fill Conversion ────────────────────────────────────────────────────────

function convertFills(fills: FigmaPaint[] | undefined): IRFill[] {
  if (!fills) return [];
  const result: IRFill[] = [];

  for (const fill of fills) {
    const converted = convertFill(fill);
    if (converted) {
      result.push(converted);
    }
  }

  return result;
}

function convertFill(paint: FigmaPaint): IRFill | null {
  const visible = paint.visible !== false;
  const opacity = paint.opacity ?? 1;

  switch (paint.type) {
    case 'SOLID': {
      if (!paint.color) return null;
      return {
        type: 'solid',
        color: convertColor(paint.color),
        opacity,
        visible,
      } satisfies IRSolidFill;
    }

    case 'GRADIENT_LINEAR': {
      if (!paint.gradientHandlePositions || !paint.gradientStops) return null;
      const handles = paint.gradientHandlePositions;
      return {
        type: 'linearGradient',
        start: { x: handles[0].x, y: handles[0].y },
        end: { x: handles[1].x, y: handles[1].y },
        stops: convertGradientStops(paint.gradientStops),
        opacity,
        visible,
      } satisfies IRLinearGradientFill;
    }

    case 'GRADIENT_RADIAL': {
      if (!paint.gradientHandlePositions || !paint.gradientStops) return null;
      const handles = paint.gradientHandlePositions;
      // Center is handle[0], radius derived from handle distances
      const center = { x: handles[0].x, y: handles[0].y };
      const radius = {
        x: Math.sqrt(
          (handles[1].x - handles[0].x) ** 2 + (handles[1].y - handles[0].y) ** 2,
        ),
        y: Math.sqrt(
          (handles[2].x - handles[0].x) ** 2 + (handles[2].y - handles[0].y) ** 2,
        ),
      };
      return {
        type: 'radialGradient',
        center,
        radius,
        stops: convertGradientStops(paint.gradientStops),
        opacity,
        visible,
      } satisfies IRRadialGradientFill;
    }

    case 'IMAGE': {
      if (!paint.imageRef) return null;
      return {
        type: 'image',
        imageRef: paint.imageRef,
        scaleMode: (paint.scaleMode?.toLowerCase() ?? 'fill') as IRImageFill['scaleMode'],
        opacity,
        visible,
      } satisfies IRImageFill;
    }

    // Unsupported gradient types or emoji — skip
    default:
      return null;
  }
}

function convertGradientStops(stops: FigmaColorStop[]): Array<{ position: number; color: IRColor }> {
  return stops.map((stop) => ({
    position: stop.position,
    color: convertColor(stop.color),
  }));
}

// ─── Stroke Conversion ──────────────────────────────────────────────────────

function convertStrokes(
  strokes: FigmaPaint[] | undefined,
  strokeWeight: number | undefined,
  strokeAlign: string | undefined,
  strokeCap: string | undefined,
  strokeJoin: string | undefined,
): IRStroke[] {
  if (!strokes || strokes.length === 0) return [];
  const result: IRStroke[] = [];

  for (const stroke of strokes) {
    if (stroke.visible === false) continue;
    if (stroke.type !== 'SOLID' || !stroke.color) continue;

    result.push({
      color: convertColor(stroke.color),
      weight: strokeWeight ?? 1,
      align: convertStrokeAlign(strokeAlign),
      cap: convertStrokeCap(strokeCap),
      join: convertStrokeJoin(strokeJoin),
      dashes: [],
      opacity: stroke.opacity ?? 1,
      visible: stroke.visible !== false,
    });
  }

  return result;
}

function convertStrokeAlign(align: string | undefined): IRStroke['align'] {
  switch (align) {
    case 'INSIDE': return 'inside';
    case 'OUTSIDE': return 'outside';
    case 'CENTER': return 'center';
    default: return 'center';
  }
}

function convertStrokeCap(cap: string | undefined): IRStroke['cap'] {
  switch (cap) {
    case 'ROUND': return 'round';
    case 'SQUARE': return 'square';
    default: return 'none';
  }
}

function convertStrokeJoin(join: string | undefined): IRStroke['join'] {
  switch (join) {
    case 'BEVEL': return 'bevel';
    case 'ROUND': return 'round';
    default: return 'miter';
  }
}

// ─── Effect Conversion ──────────────────────────────────────────────────────

function convertEffects(effects: FigmaEffect[] | undefined): IREffect[] {
  if (!effects) return [];
  const result: IREffect[] = [];

  for (const effect of effects) {
    const converted = convertEffect(effect);
    if (converted) {
      result.push(converted);
    }
  }

  return result;
}

function convertEffect(effect: FigmaEffect): IREffect | null {
  const visible = effect.visible;

  switch (effect.type) {
    case 'DROP_SHADOW':
      return {
        type: 'dropShadow',
        color: effect.color ? convertColor(effect.color) : { r: 0, g: 0, b: 0, a: 0.25 },
        offset: effect.offset ? { x: effect.offset.x, y: effect.offset.y } : { x: 0, y: 0 },
        radius: effect.radius,
        spread: effect.spread ?? 0,
        visible,
      } satisfies IRDropShadow;

    case 'INNER_SHADOW':
      return {
        type: 'innerShadow',
        color: effect.color ? convertColor(effect.color) : { r: 0, g: 0, b: 0, a: 0.25 },
        offset: effect.offset ? { x: effect.offset.x, y: effect.offset.y } : { x: 0, y: 0 },
        radius: effect.radius,
        spread: effect.spread ?? 0,
        visible,
      } satisfies IRInnerShadow;

    case 'LAYER_BLUR':
      return {
        type: 'layerBlur',
        radius: effect.radius,
        visible,
      } satisfies IRBlur;

    case 'BACKGROUND_BLUR':
      return {
        type: 'backgroundBlur',
        radius: effect.radius,
        visible,
      } satisfies IRBlur;

    default:
      return null;
  }
}

// ─── Corner Radius ──────────────────────────────────────────────────────────

function extractCornerRadius(node: FigmaCornerMixin): IRCornerRadius {
  if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    return {
      topLeft: tl,
      topRight: tr,
      bottomRight: br,
      bottomLeft: bl,
      isUniform: tl === tr && tr === br && br === bl,
    };
  }

  const r = node.cornerRadius ?? 0;
  return {
    topLeft: r,
    topRight: r,
    bottomRight: r,
    bottomLeft: r,
    isUniform: true,
  };
}

// ─── Text Style ─────────────────────────────────────────────────────────────

function extractTextStyle(style: FigmaTypeStyle): IRTextStyle {
  // Extract text color from style fills
  let color: IRColor = { r: 0, g: 0, b: 0, a: 1 };
  if (style.fills && style.fills.length > 0) {
    const firstFill = style.fills[0];
    if (firstFill.type === 'SOLID' && firstFill.color) {
      color = convertColor(firstFill.color);
    }
  }

  return {
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontSize: style.fontSize,
    italic: style.italic ?? false,
    letterSpacing: convertLetterSpacing(style),
    lineHeight: style.lineHeightPx,
    textAlignHorizontal: style.textAlignHorizontal.toLowerCase() as IRTextStyle['textAlignHorizontal'],
    textAlignVertical: style.textAlignVertical.toLowerCase() as IRTextStyle['textAlignVertical'],
    textDecoration: convertTextDecoration(style.textDecoration),
    textCase: convertTextCase(style.textCase),
    color,
  };
}

function convertLetterSpacing(style: FigmaTypeStyle): number {
  if (!style.letterSpacing) return 0;
  if (style.letterSpacing.unit === 'PIXELS') {
    return style.letterSpacing.value;
  }
  // PERCENT: convert percentage of font size to pixels
  return (style.letterSpacing.value / 100) * style.fontSize;
}

function convertTextDecoration(decoration: string | undefined): IRTextStyle['textDecoration'] {
  switch (decoration) {
    case 'UNDERLINE': return 'underline';
    case 'STRIKETHROUGH': return 'strikethrough';
    default: return 'none';
  }
}

function convertTextCase(textCase: string | undefined): IRTextStyle['textCase'] {
  switch (textCase) {
    case 'UPPER': return 'upper';
    case 'LOWER': return 'lower';
    case 'TITLE': return 'title';
    default: return 'original';
  }
}

function convertTextAutoResize(autoResize: string | undefined): IRTextNode['autoResize'] {
  switch (autoResize) {
    case 'HEIGHT': return 'height';
    case 'WIDTH_AND_HEIGHT': return 'widthAndHeight';
    case 'TRUNCATE': return 'truncate';
    default: return 'none';
  }
}

// ─── Auto Layout ────────────────────────────────────────────────────────────

function extractAutoLayout(node: FigmaFrameMixin): IRAutoLayout | undefined {
  if (!node.layoutMode || node.layoutMode === 'NONE') {
    return undefined;
  }

  return {
    mode: node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical',
    primaryAxisAlign: convertPrimaryAxisAlign(node.primaryAxisAlignItems),
    counterAxisAlign: convertCounterAxisAlign(node.counterAxisAlignItems),
    paddingTop: node.paddingTop ?? 0,
    paddingRight: node.paddingRight ?? 0,
    paddingBottom: node.paddingBottom ?? 0,
    paddingLeft: node.paddingLeft ?? 0,
    itemSpacing: node.itemSpacing ?? 0,
    primaryAxisSizing: node.primaryAxisSizingMode === 'AUTO' ? 'auto' : 'fixed',
    counterAxisSizing: node.counterAxisSizingMode === 'AUTO' ? 'auto' : 'fixed',
    wrap: node.layoutWrap === 'WRAP',
  };
}

function convertPrimaryAxisAlign(align: string | undefined): IRAutoLayout['primaryAxisAlign'] {
  switch (align) {
    case 'CENTER': return 'center';
    case 'MAX': return 'max';
    case 'SPACE_BETWEEN': return 'spaceBetween';
    default: return 'min';
  }
}

function convertCounterAxisAlign(align: string | undefined): IRAutoLayout['counterAxisAlign'] {
  switch (align) {
    case 'CENTER': return 'center';
    case 'MAX': return 'max';
    case 'BASELINE': return 'baseline';
    default: return 'min';
  }
}

function convertLayoutAlign(align: string | undefined): IRNodeBase['layoutAlign'] {
  switch (align) {
    case 'STRETCH': return 'stretch';
    case 'MIN': return 'min';
    case 'CENTER': return 'center';
    case 'MAX': return 'max';
    default: return 'inherit';
  }
}

// ─── Constraints ────────────────────────────────────────────────────────────

function convertConstraints(constraints: { horizontal: string; vertical: string }): IRConstraints {
  return {
    horizontal: convertHorizontalConstraint(constraints.horizontal),
    vertical: convertVerticalConstraint(constraints.vertical),
  };
}

function convertHorizontalConstraint(c: string): IRConstraints['horizontal'] {
  switch (c) {
    case 'RIGHT': return 'right';
    case 'CENTER': return 'center';
    case 'LEFT_RIGHT': return 'leftRight';
    case 'SCALE': return 'scale';
    default: return 'left';
  }
}

function convertVerticalConstraint(c: string): IRConstraints['vertical'] {
  switch (c) {
    case 'BOTTOM': return 'bottom';
    case 'CENTER': return 'center';
    case 'TOP_BOTTOM': return 'topBottom';
    case 'SCALE': return 'scale';
    default: return 'top';
  }
}

// ─── Paths (Vector Geometry) ────────────────────────────────────────────────

function extractPaths(
  fillGeometry: FigmaPathGeometry[] | undefined,
  strokeGeometry: FigmaPathGeometry[] | undefined,
): IRPathData[] {
  const paths: IRPathData[] = [];

  if (fillGeometry) {
    for (const geo of fillGeometry) {
      paths.push({
        path: geo.path,
        windingRule: geo.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero',
      });
    }
  }

  if (strokeGeometry) {
    for (const geo of strokeGeometry) {
      paths.push({
        path: geo.path,
        windingRule: geo.windingRule === 'EVENODD' ? 'evenodd' : 'nonzero',
      });
    }
  }

  return paths;
}

// ─── Color ──────────────────────────────────────────────────────────────────

function convertColor(color: FigmaColor): IRColor {
  return {
    r: color.r,
    g: color.g,
    b: color.b,
    a: color.a,
  };
}
