// Intermediate Representation (IR) types
// Normalized, JUCE-friendly structures that bridge Figma concepts to code generation.

// ─── Primitives ──────────────────────────────────────────────────────────────

export interface IRBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IRColor {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

export interface IRVector2 {
  x: number;
  y: number;
}

// ─── Fills ───────────────────────────────────────────────────────────────────

export type IRFillType = 'solid' | 'linearGradient' | 'radialGradient' | 'image';

export interface IRSolidFill {
  type: 'solid';
  color: IRColor;
  opacity: number;
  visible: boolean;
}

export interface IRGradientStop {
  position: number; // 0-1
  color: IRColor;
}

export interface IRLinearGradientFill {
  type: 'linearGradient';
  start: IRVector2;
  end: IRVector2;
  stops: IRGradientStop[];
  opacity: number;
  visible: boolean;
}

export interface IRRadialGradientFill {
  type: 'radialGradient';
  center: IRVector2;
  radius: IRVector2;
  stops: IRGradientStop[];
  opacity: number;
  visible: boolean;
}

export interface IRImageFill {
  type: 'image';
  imageRef: string;
  scaleMode: 'fill' | 'fit' | 'crop' | 'tile';
  opacity: number;
  visible: boolean;
}

export type IRFill = IRSolidFill | IRLinearGradientFill | IRRadialGradientFill | IRImageFill;

// ─── Strokes ─────────────────────────────────────────────────────────────────

export interface IRStroke {
  color: IRColor;
  weight: number;
  align: 'inside' | 'outside' | 'center';
  cap: 'none' | 'round' | 'square';
  join: 'miter' | 'bevel' | 'round';
  dashes: number[];
  opacity: number;
  visible: boolean;
}

// ─── Effects ─────────────────────────────────────────────────────────────────

export interface IRDropShadow {
  type: 'dropShadow';
  color: IRColor;
  offset: IRVector2;
  radius: number;
  spread: number;
  visible: boolean;
}

export interface IRInnerShadow {
  type: 'innerShadow';
  color: IRColor;
  offset: IRVector2;
  radius: number;
  spread: number;
  visible: boolean;
}

export interface IRBlur {
  type: 'layerBlur' | 'backgroundBlur';
  radius: number;
  visible: boolean;
}

export type IREffect = IRDropShadow | IRInnerShadow | IRBlur;

// ─── Corner Radius ───────────────────────────────────────────────────────────

export interface IRCornerRadius {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
  isUniform: boolean;
}

// ─── Text Style ──────────────────────────────────────────────────────────────

export interface IRTextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  italic: boolean;
  letterSpacing: number; // in pixels
  lineHeight: number; // in pixels
  textAlignHorizontal: 'left' | 'center' | 'right' | 'justified';
  textAlignVertical: 'top' | 'center' | 'bottom';
  textDecoration: 'none' | 'underline' | 'strikethrough';
  textCase: 'original' | 'upper' | 'lower' | 'title';
  color: IRColor;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export type IRLayoutMode = 'none' | 'horizontal' | 'vertical';

export interface IRAutoLayout {
  mode: 'horizontal' | 'vertical';
  primaryAxisAlign: 'min' | 'center' | 'max' | 'spaceBetween';
  counterAxisAlign: 'min' | 'center' | 'max' | 'baseline';
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  itemSpacing: number;
  primaryAxisSizing: 'fixed' | 'auto';
  counterAxisSizing: 'fixed' | 'auto';
  wrap: boolean;
}

export interface IRConstraints {
  horizontal: 'left' | 'right' | 'center' | 'leftRight' | 'scale';
  vertical: 'top' | 'bottom' | 'center' | 'topBottom' | 'scale';
}

// ─── Path (Vector) ───────────────────────────────────────────────────────────

export interface IRPathData {
  path: string; // SVG path string
  windingRule: 'nonzero' | 'evenodd';
}

// ─── Node Types ──────────────────────────────────────────────────────────────

export type IRNodeType =
  | 'frame'
  | 'group'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'vector'
  | 'line'
  | 'booleanOperation'
  | 'component'
  | 'instance';

// Base properties for all IR nodes
export interface IRNodeBase {
  id: string;
  name: string;
  type: IRNodeType;
  visible: boolean;
  opacity: number;
  bounds: IRBounds;
  // Position relative to parent (for absolute-positioned children)
  relativeX: number;
  relativeY: number;
  fills: IRFill[];
  strokes: IRStroke[];
  effects: IREffect[];
  blendMode: string;
  // Auto-layout child properties
  layoutAlign?: 'inherit' | 'stretch' | 'min' | 'center' | 'max';
  layoutGrow?: number;
  layoutPositioning?: 'auto' | 'absolute';
  constraints?: IRConstraints;
}

// Frame or component (container with optional auto-layout)
export interface IRFrameNode extends IRNodeBase {
  type: 'frame' | 'component' | 'instance';
  children: IRNode[];
  cornerRadius: IRCornerRadius;
  clipsContent: boolean;
  autoLayout?: IRAutoLayout;
  // Component-specific
  componentId?: string; // For instances, the component they reference
}

export interface IRGroupNode extends IRNodeBase {
  type: 'group';
  children: IRNode[];
}

export interface IRRectangleNode extends IRNodeBase {
  type: 'rectangle';
  cornerRadius: IRCornerRadius;
}

export interface IREllipseNode extends IRNodeBase {
  type: 'ellipse';
  arcStartAngle?: number;
  arcEndAngle?: number;
  innerRadius?: number;
}

export interface IRTextNode extends IRNodeBase {
  type: 'text';
  characters: string;
  textStyle: IRTextStyle;
  autoResize: 'none' | 'height' | 'widthAndHeight' | 'truncate';
}

export interface IRVectorNode extends IRNodeBase {
  type: 'vector' | 'line' | 'booleanOperation';
  paths: IRPathData[];
  booleanOperation?: 'union' | 'intersect' | 'subtract' | 'exclude';
}

// Union of all IR node types
export type IRNode =
  | IRFrameNode
  | IRGroupNode
  | IRRectangleNode
  | IREllipseNode
  | IRTextNode
  | IRVectorNode;

// ─── Root Document ───────────────────────────────────────────────────────────

export interface IRDocument {
  name: string;
  pages: IRPage[];
}

export interface IRPage {
  id: string;
  name: string;
  backgroundColor: IRColor;
  children: IRNode[];
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isIRFrameNode(node: IRNode): node is IRFrameNode {
  return node.type === 'frame' || node.type === 'component' || node.type === 'instance';
}

export function isIRGroupNode(node: IRNode): node is IRGroupNode {
  return node.type === 'group';
}

export function isIRRectangleNode(node: IRNode): node is IRRectangleNode {
  return node.type === 'rectangle';
}

export function isIREllipseNode(node: IRNode): node is IREllipseNode {
  return node.type === 'ellipse';
}

export function isIRTextNode(node: IRNode): node is IRTextNode {
  return node.type === 'text';
}

export function isIRVectorNode(node: IRNode): node is IRVectorNode {
  return node.type === 'vector' || node.type === 'line' || node.type === 'booleanOperation';
}

export function hasIRChildren(node: IRNode): node is IRFrameNode | IRGroupNode {
  return isIRFrameNode(node) || isIRGroupNode(node);
}
