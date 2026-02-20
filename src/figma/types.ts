// Figma REST API type definitions
// Based on https://developers.figma.com/docs/rest-api/

// ─── Primitives ──────────────────────────────────────────────────────────────

export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaVector {
  x: number;
  y: number;
}

export interface FigmaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaTransform {
  // 2D affine transform matrix [[a,b,tx],[c,d,ty]]
  0: [number, number, number];
  1: [number, number, number];
}

export interface FigmaColorStop {
  position: number;
  color: FigmaColor;
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type FigmaNodeType =
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'GROUP'
  | 'VECTOR'
  | 'BOOLEAN_OPERATION'
  | 'STAR'
  | 'LINE'
  | 'ELLIPSE'
  | 'REGULAR_POLYGON'
  | 'RECTANGLE'
  | 'TEXT'
  | 'SLICE'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'SECTION';

export type FigmaBlendMode =
  | 'PASS_THROUGH'
  | 'NORMAL'
  | 'DARKEN'
  | 'MULTIPLY'
  | 'LINEAR_BURN'
  | 'COLOR_BURN'
  | 'LIGHTEN'
  | 'SCREEN'
  | 'LINEAR_DODGE'
  | 'COLOR_DODGE'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY';

export type FigmaConstraintType =
  | 'MIN'
  | 'CENTER'
  | 'MAX'
  | 'STRETCH'
  | 'SCALE';

export type FigmaConstraintHorizontal =
  | 'LEFT'
  | 'RIGHT'
  | 'CENTER'
  | 'LEFT_RIGHT'
  | 'SCALE';

export type FigmaConstraintVertical =
  | 'TOP'
  | 'BOTTOM'
  | 'CENTER'
  | 'TOP_BOTTOM'
  | 'SCALE';

export type FigmaLayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';

export type FigmaAxisSizingMode = 'FIXED' | 'AUTO';

export type FigmaPrimaryAxisAlignItems =
  | 'MIN'
  | 'CENTER'
  | 'MAX'
  | 'SPACE_BETWEEN';

export type FigmaCounterAxisAlignItems = 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';

export type FigmaLayoutAlign = 'INHERIT' | 'STRETCH' | 'MIN' | 'CENTER' | 'MAX';

export type FigmaLayoutPositioning = 'AUTO' | 'ABSOLUTE';

export type FigmaFillType =
  | 'SOLID'
  | 'GRADIENT_LINEAR'
  | 'GRADIENT_RADIAL'
  | 'GRADIENT_ANGULAR'
  | 'GRADIENT_DIAMOND'
  | 'IMAGE'
  | 'EMOJI';

export type FigmaScaleMode = 'FILL' | 'FIT' | 'CROP' | 'TILE';

export type FigmaEffectType =
  | 'INNER_SHADOW'
  | 'DROP_SHADOW'
  | 'LAYER_BLUR'
  | 'BACKGROUND_BLUR';

export type FigmaStrokeAlign = 'INSIDE' | 'OUTSIDE' | 'CENTER';

export type FigmaStrokeCap =
  | 'NONE'
  | 'ROUND'
  | 'SQUARE'
  | 'LINE_ARROW'
  | 'TRIANGLE_ARROW';

export type FigmaStrokeJoin = 'MITER' | 'BEVEL' | 'ROUND';

export type FigmaTextAlignHorizontal = 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';

export type FigmaTextAlignVertical = 'TOP' | 'CENTER' | 'BOTTOM';

export type FigmaTextAutoResize = 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT' | 'TRUNCATE';

export type FigmaTextDecoration = 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';

export type FigmaTextCase = 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED';

export type FigmaLineHeightUnit = 'PIXELS' | 'FONT_SIZE_%' | 'INTRINSIC_%';

export type FigmaLetterSpacingUnit = 'PIXELS' | 'PERCENT';

export type FigmaBooleanOperationType = 'UNION' | 'INTERSECT' | 'SUBTRACT' | 'EXCLUDE';

export type FigmaOverflowDirection = 'NONE' | 'HORIZONTAL_SCROLLING' | 'VERTICAL_SCROLLING' | 'HORIZONTAL_AND_VERTICAL_SCROLLING';

// ─── Paint & Effects ─────────────────────────────────────────────────────────

export interface FigmaPaint {
  type: FigmaFillType;
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  blendMode?: FigmaBlendMode;
  gradientHandlePositions?: FigmaVector[];
  gradientStops?: FigmaColorStop[];
  scaleMode?: FigmaScaleMode;
  imageRef?: string;
  imageTransform?: FigmaTransform;
  scalingFactor?: number;
  gifRef?: string;
}

export interface FigmaEffect {
  type: FigmaEffectType;
  visible: boolean;
  radius: number;
  color?: FigmaColor;
  blendMode?: FigmaBlendMode;
  offset?: FigmaVector;
  spread?: number;
  showShadowBehindNode?: boolean;
}

export interface FigmaStroke {
  type: FigmaFillType;
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  blendMode?: FigmaBlendMode;
  gradientHandlePositions?: FigmaVector[];
  gradientStops?: FigmaColorStop[];
}

// ─── Text Style ──────────────────────────────────────────────────────────────

export interface FigmaLetterSpacing {
  value: number;
  unit: FigmaLetterSpacingUnit;
}

export interface FigmaLineHeight {
  value?: number;
  unit: FigmaLineHeightUnit;
}

export interface FigmaTypeStyle {
  fontFamily: string;
  fontPostScriptName?: string;
  fontWeight: number;
  fontSize: number;
  textAlignHorizontal: FigmaTextAlignHorizontal;
  textAlignVertical: FigmaTextAlignVertical;
  letterSpacing: FigmaLetterSpacing;
  lineHeightPx: number;
  lineHeightPercent?: number;
  lineHeightPercentFontSize?: number;
  lineHeightUnit: FigmaLineHeightUnit;
  fills?: FigmaPaint[];
  italic?: boolean;
  textDecoration?: FigmaTextDecoration;
  textCase?: FigmaTextCase;
  paragraphSpacing?: number;
  paragraphIndent?: number;
}

// ─── Constraints ─────────────────────────────────────────────────────────────

export interface FigmaConstraints {
  horizontal: FigmaConstraintHorizontal;
  vertical: FigmaConstraintVertical;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export interface FigmaLayoutGrid {
  pattern: 'COLUMNS' | 'ROWS' | 'GRID';
  sectionSize: number;
  visible: boolean;
  color: FigmaColor;
  alignment: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH';
  gutterSize: number;
  offset: number;
  count: number;
}

// ─── Path Geometry ───────────────────────────────────────────────────────────

export interface FigmaPathGeometry {
  path: string;
  windingRule: 'NONZERO' | 'EVENODD';
  overrideID?: number;
}

// ─── Component Metadata ──────────────────────────────────────────────────────

export interface FigmaComponentMeta {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks?: Array<{ uri: string }>;
}

export interface FigmaStyleMeta {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

// ─── Node Types ──────────────────────────────────────────────────────────────

// Base properties shared by all nodes
export interface FigmaBaseNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible?: boolean;
  pluginData?: Record<string, string>;
  sharedPluginData?: Record<string, Record<string, string>>;
}

// Properties shared by nodes that can have visual styles
export interface FigmaSceneNodeBase extends FigmaBaseNode {
  locked?: boolean;
  opacity?: number;
  blendMode?: FigmaBlendMode;
  absoluteBoundingBox?: FigmaRect;
  absoluteRenderBounds?: FigmaRect;
  relativeTransform?: FigmaTransform;
  size?: FigmaVector;
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  individualStrokeWeights?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  strokeAlign?: FigmaStrokeAlign;
  strokeCap?: FigmaStrokeCap;
  strokeJoin?: FigmaStrokeJoin;
  strokeDashes?: number[];
  strokeMiterAngle?: number;
  effects?: FigmaEffect[];
  isMask?: boolean;
  exportSettings?: FigmaExportSetting[];
  constraints?: FigmaConstraints;
  rotation?: number;
}

export interface FigmaExportSetting {
  suffix: string;
  format: 'JPG' | 'PNG' | 'SVG' | 'PDF';
  constraint: {
    type: 'SCALE' | 'WIDTH' | 'HEIGHT';
    value: number;
  };
}

// Mixin for nodes with children
export interface FigmaChildrenMixin {
  children: FigmaNode[];
}

// Mixin for frame-like properties (auto-layout, padding, clipping)
export interface FigmaFrameMixin {
  clipsContent?: boolean;
  layoutMode?: FigmaLayoutMode;
  primaryAxisSizingMode?: FigmaAxisSizingMode;
  counterAxisSizingMode?: FigmaAxisSizingMode;
  primaryAxisAlignItems?: FigmaPrimaryAxisAlignItems;
  counterAxisAlignItems?: FigmaCounterAxisAlignItems;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  overflowDirection?: FigmaOverflowDirection;
  layoutGrids?: FigmaLayoutGrid[];
  // Child-level auto-layout properties
  layoutAlign?: FigmaLayoutAlign;
  layoutGrow?: number;
  layoutPositioning?: FigmaLayoutPositioning;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

// Mixin for corner radius
export interface FigmaCornerMixin {
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number]; // TL, TR, BR, BL
  cornerSmoothing?: number;
}

// ─── Concrete Node Types ─────────────────────────────────────────────────────

export interface FigmaDocumentNode extends FigmaBaseNode {
  type: 'DOCUMENT';
  children: FigmaNode[];
}

export interface FigmaCanvasNode extends FigmaBaseNode {
  type: 'CANVAS';
  children: FigmaNode[];
  backgroundColor: FigmaColor;
  prototypeStartNodeID?: string;
}

export interface FigmaFrameNode extends FigmaSceneNodeBase, FigmaChildrenMixin, FigmaFrameMixin, FigmaCornerMixin {
  type: 'FRAME';
}

export interface FigmaGroupNode extends FigmaSceneNodeBase, FigmaChildrenMixin {
  type: 'GROUP';
}

export interface FigmaRectangleNode extends FigmaSceneNodeBase, FigmaCornerMixin {
  type: 'RECTANGLE';
  fillGeometry?: FigmaPathGeometry[];
  strokeGeometry?: FigmaPathGeometry[];
}

export interface FigmaEllipseNode extends FigmaSceneNodeBase {
  type: 'ELLIPSE';
  arcData?: {
    startingAngle: number;
    endingAngle: number;
    innerRadius: number;
  };
  fillGeometry?: FigmaPathGeometry[];
  strokeGeometry?: FigmaPathGeometry[];
}

export interface FigmaLineNode extends FigmaSceneNodeBase {
  type: 'LINE';
  strokeGeometry?: FigmaPathGeometry[];
}

export interface FigmaVectorNode extends FigmaSceneNodeBase {
  type: 'VECTOR';
  fillGeometry?: FigmaPathGeometry[];
  strokeGeometry?: FigmaPathGeometry[];
}

export interface FigmaBooleanOperationNode extends FigmaSceneNodeBase, FigmaChildrenMixin {
  type: 'BOOLEAN_OPERATION';
  booleanOperation: FigmaBooleanOperationType;
  fillGeometry?: FigmaPathGeometry[];
  strokeGeometry?: FigmaPathGeometry[];
}

export interface FigmaTextNode extends FigmaSceneNodeBase {
  type: 'TEXT';
  characters: string;
  style: FigmaTypeStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<number, Partial<FigmaTypeStyle>>;
  textAutoResize?: FigmaTextAutoResize;
  fillGeometry?: FigmaPathGeometry[];
  strokeGeometry?: FigmaPathGeometry[];
  // Child-level auto-layout properties (when inside auto-layout frame)
  layoutAlign?: FigmaLayoutAlign;
  layoutGrow?: number;
  layoutPositioning?: FigmaLayoutPositioning;
}

export interface FigmaComponentNode extends FigmaSceneNodeBase, FigmaChildrenMixin, FigmaFrameMixin, FigmaCornerMixin {
  type: 'COMPONENT';
  componentPropertyDefinitions?: Record<string, FigmaComponentPropertyDefinition>;
}

export interface FigmaComponentSetNode extends FigmaSceneNodeBase, FigmaChildrenMixin, FigmaFrameMixin {
  type: 'COMPONENT_SET';
  componentPropertyDefinitions?: Record<string, FigmaComponentPropertyDefinition>;
}

export interface FigmaInstanceNode extends FigmaSceneNodeBase, FigmaChildrenMixin, FigmaFrameMixin, FigmaCornerMixin {
  type: 'INSTANCE';
  componentId: string;
  componentProperties?: Record<string, FigmaComponentProperty>;
}

export interface FigmaSectionNode extends FigmaBaseNode, FigmaChildrenMixin {
  type: 'SECTION';
  absoluteBoundingBox?: FigmaRect;
  fills?: FigmaPaint[];
}

export interface FigmaComponentPropertyDefinition {
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  defaultValue: string | boolean;
  variantOptions?: string[];
  preferredValues?: Array<{ type: 'COMPONENT' | 'COMPONENT_SET'; key: string }>;
}

export interface FigmaComponentProperty {
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
  value: string | boolean;
  preferredValues?: Array<{ type: 'COMPONENT' | 'COMPONENT_SET'; key: string }>;
}

// Union of all node types
export type FigmaNode =
  | FigmaDocumentNode
  | FigmaCanvasNode
  | FigmaFrameNode
  | FigmaGroupNode
  | FigmaRectangleNode
  | FigmaEllipseNode
  | FigmaLineNode
  | FigmaVectorNode
  | FigmaBooleanOperationNode
  | FigmaTextNode
  | FigmaComponentNode
  | FigmaComponentSetNode
  | FigmaInstanceNode
  | FigmaSectionNode;

// ─── API Response Types ──────────────────────────────────────────────────────

export interface FigmaFileResponse {
  name: string;
  role: string;
  lastModified: string;
  editorType: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaDocumentNode;
  components: Record<string, FigmaComponentMeta>;
  componentSets: Record<string, FigmaComponentMeta>;
  styles: Record<string, FigmaStyleMeta>;
  schemaVersion: number;
}

export interface FigmaNodesResponse {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  nodes: Record<string, {
    document: FigmaNode;
    components: Record<string, FigmaComponentMeta>;
    styles: Record<string, FigmaStyleMeta>;
  }>;
}

export interface FigmaImageResponse {
  err: string | null;
  images: Record<string, string | null>;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isDocumentNode(node: FigmaNode): node is FigmaDocumentNode {
  return node.type === 'DOCUMENT';
}

export function isCanvasNode(node: FigmaNode): node is FigmaCanvasNode {
  return node.type === 'CANVAS';
}

export function isFrameNode(node: FigmaNode): node is FigmaFrameNode {
  return node.type === 'FRAME';
}

export function isGroupNode(node: FigmaNode): node is FigmaGroupNode {
  return node.type === 'GROUP';
}

export function isRectangleNode(node: FigmaNode): node is FigmaRectangleNode {
  return node.type === 'RECTANGLE';
}

export function isEllipseNode(node: FigmaNode): node is FigmaEllipseNode {
  return node.type === 'ELLIPSE';
}

export function isLineNode(node: FigmaNode): node is FigmaLineNode {
  return node.type === 'LINE';
}

export function isVectorNode(node: FigmaNode): node is FigmaVectorNode {
  return node.type === 'VECTOR';
}

export function isBooleanOperationNode(node: FigmaNode): node is FigmaBooleanOperationNode {
  return node.type === 'BOOLEAN_OPERATION';
}

export function isTextNode(node: FigmaNode): node is FigmaTextNode {
  return node.type === 'TEXT';
}

export function isComponentNode(node: FigmaNode): node is FigmaComponentNode {
  return node.type === 'COMPONENT';
}

export function isComponentSetNode(node: FigmaNode): node is FigmaComponentSetNode {
  return node.type === 'COMPONENT_SET';
}

export function isInstanceNode(node: FigmaNode): node is FigmaInstanceNode {
  return node.type === 'INSTANCE';
}

export function isSectionNode(node: FigmaNode): node is FigmaSectionNode {
  return node.type === 'SECTION';
}

export function hasChildren(node: FigmaNode): node is FigmaNode & FigmaChildrenMixin {
  return 'children' in node && Array.isArray((node as FigmaNode & FigmaChildrenMixin).children);
}

export function isFrameLike(node: FigmaNode): node is FigmaFrameNode | FigmaComponentNode | FigmaInstanceNode {
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE';
}
