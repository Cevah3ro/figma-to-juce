import { describe, it, expect } from 'vitest';
import { generateResizedBody, generateFlexBoxLayout } from '../../src/codegen/resized.js';
import type {
  IRFrameNode,
  IRRectangleNode,
  IRAutoLayout,
  IRCornerRadius,
} from '../../src/ir/types.js';

function makeCornerRadius(r: number): IRCornerRadius {
  return { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r, isUniform: true };
}

function makeFrame(overrides: Partial<IRFrameNode> = {}): IRFrameNode {
  return {
    id: 'f:1',
    name: 'TestFrame',
    type: 'frame',
    visible: true,
    opacity: 1,
    bounds: { x: 0, y: 0, width: 400, height: 300 },
    relativeX: 0,
    relativeY: 0,
    fills: [],
    strokes: [],
    effects: [],
    blendMode: 'NORMAL',
    children: [],
    cornerRadius: makeCornerRadius(0),
    clipsContent: false,
    ...overrides,
  };
}

function makeRect(overrides: Partial<IRRectangleNode> = {}): IRRectangleNode {
  return {
    id: 'r:1',
    name: 'Panel',
    type: 'rectangle',
    visible: true,
    opacity: 1,
    bounds: { x: 20, y: 20, width: 360, height: 260 },
    relativeX: 20,
    relativeY: 20,
    fills: [],
    strokes: [],
    effects: [],
    blendMode: 'NORMAL',
    cornerRadius: makeCornerRadius(0),
    ...overrides,
  };
}

// ─── generateResizedBody ────────────────────────────────────────────────────

describe('generateResizedBody', () => {
  it('generates auto bounds = getLocalBounds()', () => {
    const frame = makeFrame();
    const result = generateResizedBody(frame);
    expect(result).toContain('auto bounds = getLocalBounds()');
  });

  it('generates proportional bounds for children', () => {
    const rect = makeRect();
    const frame = makeFrame({ children: [rect] });
    const result = generateResizedBody(frame);

    expect(result).toContain('// Panel');
    expect(result).toContain('getProportion');
  });

  it('generates correct proportional values', () => {
    // relX=20, relY=20, w=360, h=260, parentW=400, parentH=300
    // xProp=20/400=0.05, yProp=20/300=0.0667, wProp=360/400=0.9, hProp=260/300=0.8667
    const rect = makeRect();
    const frame = makeFrame({ children: [rect] });
    const result = generateResizedBody(frame);

    expect(result).toContain('0.05f');
    expect(result).toContain('0.9f');
  });

  it('generates constraint-based layout for constrained children', () => {
    const rect = makeRect({
      constraints: { horizontal: 'leftRight', vertical: 'topBottom' },
    });
    const frame = makeFrame({ children: [rect] });
    const result = generateResizedBody(frame);

    expect(result).toContain('getWidth()');
    expect(result).toContain('getHeight()');
  });

  it('skips invisible children', () => {
    const rect = makeRect({ visible: false });
    const frame = makeFrame({ children: [rect] });
    const result = generateResizedBody(frame);

    expect(result).not.toContain('Panel');
  });

  it('generates left constraint', () => {
    const rect = makeRect({
      constraints: { horizontal: 'left', vertical: 'top' },
    });
    const frame = makeFrame({ children: [rect] });
    const result = generateResizedBody(frame);

    expect(result).toContain('getX() + 20');
    expect(result).toContain('getY() + 20');
  });

  it('generates right constraint', () => {
    const rect = makeRect({
      name: 'RightPanel',
      relativeX: 300,
      bounds: { x: 300, y: 20, width: 80, height: 260 },
      constraints: { horizontal: 'right', vertical: 'top' },
    });
    const frame = makeFrame({ children: [rect] });
    const result = generateResizedBody(frame);

    // rightMargin = 400 - 300 - 80 = 20
    expect(result).toContain('getRight()');
  });

  it('generates scale constraint', () => {
    const rect = makeRect({
      constraints: { horizontal: 'scale', vertical: 'scale' },
    });
    const frame = makeFrame({ children: [rect] });
    const result = generateResizedBody(frame);

    expect(result).toContain('getWidth()');
    expect(result).toContain('getHeight()');
  });
});

// ─── generateFlexBoxLayout ──────────────────────────────────────────────────

describe('generateFlexBoxLayout', () => {
  const autoLayout: IRAutoLayout = {
    mode: 'horizontal',
    primaryAxisAlign: 'spaceBetween',
    counterAxisAlign: 'center',
    paddingTop: 16,
    paddingRight: 24,
    paddingBottom: 16,
    paddingLeft: 24,
    itemSpacing: 16,
    primaryAxisSizing: 'fixed',
    counterAxisSizing: 'fixed',
    wrap: false,
  };

  it('generates FlexBox setup', () => {
    const frame = makeFrame({ autoLayout });
    const result = generateResizedBody(frame);

    expect(result).toContain('juce::FlexBox fb');
    expect(result).toContain('fb.flexDirection');
    expect(result).toContain('fb.justifyContent');
    expect(result).toContain('fb.alignItems');
  });

  it('maps horizontal direction to row', () => {
    const frame = makeFrame({ autoLayout });
    const result = generateResizedBody(frame);

    expect(result).toContain('Direction::row');
  });

  it('maps vertical direction to column', () => {
    const frame = makeFrame({
      autoLayout: { ...autoLayout, mode: 'vertical' },
    });
    const result = generateResizedBody(frame);

    expect(result).toContain('Direction::column');
  });

  it('maps spaceBetween justify content', () => {
    const frame = makeFrame({ autoLayout });
    const result = generateResizedBody(frame);

    expect(result).toContain('JustifyContent::spaceBetween');
  });

  it('maps center align items', () => {
    const frame = makeFrame({ autoLayout });
    const result = generateResizedBody(frame);

    expect(result).toContain('AlignItems::center');
  });

  it('adds flex items for children', () => {
    const rect = makeRect();
    const frame = makeFrame({ autoLayout, children: [rect] });
    const result = generateResizedBody(frame);

    expect(result).toContain('fb.items.add');
    expect(result).toContain('juce::FlexItem');
  });

  it('adds withFlex for growing items', () => {
    const rect = makeRect({ layoutGrow: 1 });
    const frame = makeFrame({ autoLayout, children: [rect] });
    const result = generateResizedBody(frame);

    expect(result).toContain('.withFlex(1.0f)');
  });

  it('adds alignSelf stretch for stretch items', () => {
    const rect = makeRect({ layoutAlign: 'stretch' });
    const frame = makeFrame({ autoLayout, children: [rect] });
    const result = generateResizedBody(frame);

    expect(result).toContain('AlignSelf::stretch');
  });

  it('applies padding via reduced()', () => {
    const frame = makeFrame({ autoLayout });
    const result = generateResizedBody(frame);

    expect(result).toContain('reduced(');
    expect(result).toContain('24');
    expect(result).toContain('16');
  });

  it('adds wrap when enabled', () => {
    const frame = makeFrame({
      autoLayout: { ...autoLayout, wrap: true },
    });
    const result = generateResizedBody(frame);

    expect(result).toContain('Wrap::wrap');
  });

  it('skips reduced() when no padding', () => {
    const frame = makeFrame({
      autoLayout: {
        ...autoLayout,
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
      },
    });
    const result = generateResizedBody(frame);

    expect(result).not.toContain('reduced(');
    expect(result).toContain('performLayout(bounds)');
  });
});
