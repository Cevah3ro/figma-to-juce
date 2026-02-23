// Generate the resized() method body for a JUCE Component from IR nodes.

import type {
  IRNode,
  IRFrameNode,
  IRAutoLayout,
  IRConstraints,
  IRBounds,
} from '../ir/types.js';
import { isIRFrameNode, isIRGroupNode } from '../ir/types.js';
import { toFloat, toInt } from '../utils/math.js';
import { toVariableName } from '../utils/naming.js';
import { detectComponentHint } from './component-hints.js';

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate the resized() method body for a component.
 * Outputs setBounds() calls using proportional coordinates,
 * or FlexBox layout for auto-layout frames.
 */
export function generateResizedBody(root: IRFrameNode): string {
  const lines: string[] = [];
  const rootW = root.bounds.width;
  const rootH = root.bounds.height;

  lines.push(`auto bounds = getLocalBounds();`);

  if (root.autoLayout) {
    lines.push(...generateFlexBoxLayout(root, 'bounds'));
  } else {
    lines.push(...generateAbsoluteLayout(root.children, rootW, rootH, 'bounds'));
  }

  return lines.join('\n');
}

// ─── Absolute Layout (setBounds with proportional coords) ───────────────────

function generateAbsoluteLayout(
  children: IRNode[],
  parentW: number,
  parentH: number,
  parentBoundsExpr: string,
): string[] {
  const lines: string[] = [];

  for (const child of children) {
    if (!child.visible) continue;

    const varName = toVariableName(child.name);
    const b = child.bounds;

    // Proportional coordinates relative to parent
    const xProp = parentW > 0 ? child.relativeX / parentW : 0;
    const yProp = parentH > 0 ? child.relativeY / parentH : 0;
    const wProp = parentW > 0 ? b.width / parentW : 0;
    const hProp = parentH > 0 ? b.height / parentH : 0;

    lines.push(
      `// ${child.name}`,
    );

    if (child.constraints) {
      lines.push(...generateConstrainedBounds(child, parentW, parentH, parentBoundsExpr));
    } else {
      lines.push(
        `auto ${varName}Bounds = ${parentBoundsExpr}.getProportion(juce::Rectangle<float>(${toFloat(xProp)}, ${toFloat(yProp)}, ${toFloat(wProp)}, ${toFloat(hProp)}));`,
      );
    }

    // If this is a detected JUCE component, add setBounds call
    const hint = detectComponentHint(child.name);
    if (hint) {
      lines.push(`${varName}.setBounds(${varName}Bounds.toNearestInt());`);
    }
  }

  return lines;
}

// ─── Constraint-based Layout ────────────────────────────────────────────────

function generateConstrainedBounds(
  child: IRNode,
  parentW: number,
  parentH: number,
  parentBoundsExpr: string,
): string[] {
  const lines: string[] = [];
  const varName = toVariableName(child.name);
  const c = child.constraints!;
  const b = child.bounds;

  const xExpr = generateHorizontalConstraint(c.horizontal, child.relativeX, b.width, parentW, parentBoundsExpr);
  const yExpr = generateVerticalConstraint(c.vertical, child.relativeY, b.height, parentH, parentBoundsExpr);
  const wExpr = generateWidthConstraint(c.horizontal, child.relativeX, b.width, parentW, parentBoundsExpr);
  const hExpr = generateHeightConstraint(c.vertical, child.relativeY, b.height, parentH, parentBoundsExpr);

  lines.push(
    `auto ${varName}Bounds = juce::Rectangle<int>(${xExpr}, ${yExpr}, ${wExpr}, ${hExpr});`,
  );

  return lines;
}

function generateHorizontalConstraint(
  constraint: IRConstraints['horizontal'],
  relX: number,
  width: number,
  parentW: number,
  parentBoundsExpr: string,
): string {
  switch (constraint) {
    case 'left':
      return `${parentBoundsExpr}.getX() + ${toInt(relX)}`;
    case 'right': {
      const rightMargin = parentW - relX - width;
      return `${parentBoundsExpr}.getRight() - ${toInt(rightMargin)} - ${toInt(width)}`;
    }
    case 'center': {
      const centerOffset = relX + width / 2 - parentW / 2;
      return `${parentBoundsExpr}.getCentreX() + ${toInt(centerOffset)} - ${toInt(width)} / 2`;
    }
    case 'leftRight':
      return `${parentBoundsExpr}.getX() + ${toInt(relX)}`;
    case 'scale': {
      const prop = parentW > 0 ? relX / parentW : 0;
      return `${parentBoundsExpr}.getX() + (int)(${parentBoundsExpr}.getWidth() * ${toFloat(prop)})`;
    }
  }
}

function generateVerticalConstraint(
  constraint: IRConstraints['vertical'],
  relY: number,
  height: number,
  parentH: number,
  parentBoundsExpr: string,
): string {
  switch (constraint) {
    case 'top':
      return `${parentBoundsExpr}.getY() + ${toInt(relY)}`;
    case 'bottom': {
      const bottomMargin = parentH - relY - height;
      return `${parentBoundsExpr}.getBottom() - ${toInt(bottomMargin)} - ${toInt(height)}`;
    }
    case 'center': {
      const centerOffset = relY + height / 2 - parentH / 2;
      return `${parentBoundsExpr}.getCentreY() + ${toInt(centerOffset)} - ${toInt(height)} / 2`;
    }
    case 'topBottom':
      return `${parentBoundsExpr}.getY() + ${toInt(relY)}`;
    case 'scale': {
      const prop = parentH > 0 ? relY / parentH : 0;
      return `${parentBoundsExpr}.getY() + (int)(${parentBoundsExpr}.getHeight() * ${toFloat(prop)})`;
    }
  }
}

function generateWidthConstraint(
  constraint: IRConstraints['horizontal'],
  relX: number,
  width: number,
  parentW: number,
  parentBoundsExpr: string,
): string {
  switch (constraint) {
    case 'leftRight': {
      const rightMargin = parentW - relX - width;
      return `${parentBoundsExpr}.getWidth() - ${toInt(relX)} - ${toInt(rightMargin)}`;
    }
    case 'scale': {
      const prop = parentW > 0 ? width / parentW : 0;
      return `(int)(${parentBoundsExpr}.getWidth() * ${toFloat(prop)})`;
    }
    default:
      return toInt(width);
  }
}

function generateHeightConstraint(
  constraint: IRConstraints['vertical'],
  relY: number,
  height: number,
  parentH: number,
  parentBoundsExpr: string,
): string {
  switch (constraint) {
    case 'topBottom': {
      const bottomMargin = parentH - relY - height;
      return `${parentBoundsExpr}.getHeight() - ${toInt(relY)} - ${toInt(bottomMargin)}`;
    }
    case 'scale': {
      const prop = parentH > 0 ? height / parentH : 0;
      return `(int)(${parentBoundsExpr}.getHeight() * ${toFloat(prop)})`;
    }
    default:
      return toInt(height);
  }
}

// ─── FlexBox Layout ─────────────────────────────────────────────────────────

/**
 * Generate juce::FlexBox code for an auto-layout frame.
 */
export function generateFlexBoxLayout(frame: IRFrameNode, boundsExpr: string): string[] {
  const lines: string[] = [];
  const al = frame.autoLayout!;

  lines.push(`juce::FlexBox fb;`);
  lines.push(`fb.flexDirection = ${mapFlexDirection(al.mode)};`);
  lines.push(`fb.justifyContent = ${mapJustifyContent(al.primaryAxisAlign)};`);
  lines.push(`fb.alignItems = ${mapAlignItems(al.counterAxisAlign)};`);

  if (al.wrap) {
    lines.push(`fb.flexWrap = juce::FlexBox::Wrap::wrap;`);
  }

  // Add items
  const visibleChildren = frame.children.filter(c => c.visible);
  for (let i = 0; i < visibleChildren.length; i++) {
    const child = visibleChildren[i];

    const w = child.bounds.width;
    const h = child.bounds.height;
    const grow = child.layoutGrow ?? 0;

    let itemExpr = `juce::FlexItem(${toFloat(w)}, ${toFloat(h)})`;
    if (grow > 0) {
      itemExpr += `.withFlex(${toFloat(grow)})`;
    }
    if (child.layoutAlign === 'stretch') {
      itemExpr += `.withAlignSelf(juce::FlexItem::AlignSelf::stretch)`;
    }
    // Apply itemSpacing as margin between items
    if (al.itemSpacing > 0 && i > 0) {
      if (al.mode === 'horizontal') {
        itemExpr += `.withMargin(juce::FlexItem::Margin(0.0f, 0.0f, 0.0f, ${toFloat(al.itemSpacing)}))`;
      } else {
        itemExpr += `.withMargin(juce::FlexItem::Margin(${toFloat(al.itemSpacing)}, 0.0f, 0.0f, 0.0f))`;
      }
    }

    lines.push(`fb.items.add(${itemExpr});`);
  }

  // Perform layout with padding
  const padT = al.paddingTop;
  const padR = al.paddingRight;
  const padB = al.paddingBottom;
  const padL = al.paddingLeft;

  if (padT > 0 || padR > 0 || padB > 0 || padL > 0) {
    lines.push(
      `fb.performLayout(${boundsExpr}.reduced(${toInt(padL)}, ${toInt(padT)}, ${toInt(padR)}, ${toInt(padB)}));`,
    );
  } else {
    lines.push(`fb.performLayout(${boundsExpr});`);
  }

  return lines;
}

// ─── FlexBox Mapping Helpers ────────────────────────────────────────────────

function mapFlexDirection(mode: 'horizontal' | 'vertical'): string {
  return mode === 'horizontal'
    ? 'juce::FlexBox::Direction::row'
    : 'juce::FlexBox::Direction::column';
}

function mapJustifyContent(align: IRAutoLayout['primaryAxisAlign']): string {
  switch (align) {
    case 'min': return 'juce::FlexBox::JustifyContent::flexStart';
    case 'center': return 'juce::FlexBox::JustifyContent::center';
    case 'max': return 'juce::FlexBox::JustifyContent::flexEnd';
    case 'spaceBetween': return 'juce::FlexBox::JustifyContent::spaceBetween';
  }
}

function mapAlignItems(align: IRAutoLayout['counterAxisAlign']): string {
  switch (align) {
    case 'min': return 'juce::FlexBox::AlignItems::flexStart';
    case 'center': return 'juce::FlexBox::AlignItems::center';
    case 'max': return 'juce::FlexBox::AlignItems::flexEnd';
    case 'baseline': return 'juce::FlexBox::AlignItems::stretch';
  }
}
