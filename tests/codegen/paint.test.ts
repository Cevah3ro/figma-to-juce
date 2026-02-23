import { describe, it, expect } from 'vitest';
import { generatePaintBody } from '../../src/codegen/paint.js';
import type {
  IRFrameNode,
  IRRectangleNode,
  IREllipseNode,
  IRTextNode,
  IRVectorNode,
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
    name: 'TestRect',
    type: 'rectangle',
    visible: true,
    opacity: 1,
    bounds: { x: 10, y: 20, width: 100, height: 50 },
    relativeX: 10,
    relativeY: 20,
    fills: [],
    strokes: [],
    effects: [],
    blendMode: 'NORMAL',
    cornerRadius: makeCornerRadius(0),
    ...overrides,
  };
}

function makeEllipse(overrides: Partial<IREllipseNode> = {}): IREllipseNode {
  return {
    id: 'e:1',
    name: 'TestEllipse',
    type: 'ellipse',
    visible: true,
    opacity: 1,
    bounds: { x: 50, y: 50, width: 80, height: 80 },
    relativeX: 50,
    relativeY: 50,
    fills: [],
    strokes: [],
    effects: [],
    blendMode: 'NORMAL',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('generatePaintBody', () => {
  it('generates empty body for empty frame', () => {
    const frame = makeFrame();
    const result = generatePaintBody(frame);
    expect(result).toBe('');
  });

  it('generates fillRect for rectangle with solid fill', () => {
    const rect = makeRect({
      fills: [{ type: 'solid', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toContain('g.setColour');
    expect(result).toContain('g.fillRect');
    expect(result).toContain('0xffff0000');
  });

  it('generates fillRoundedRectangle for rounded rect', () => {
    const rect = makeRect({
      fills: [{ type: 'solid', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }],
      cornerRadius: makeCornerRadius(12),
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toContain('fillRoundedRectangle');
    expect(result).toContain('12.0f');
  });

  it('generates fillEllipse for ellipse node', () => {
    const ellipse = makeEllipse({
      fills: [{ type: 'solid', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true }],
    });
    const frame = makeFrame({ children: [ellipse] });
    const result = generatePaintBody(frame);

    expect(result).toContain('fillEllipse');
    expect(result).toContain('0xff00ff00');
  });

  it('generates drop shadow before shape', () => {
    const rect = makeRect({
      fills: [{ type: 'solid', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
      effects: [{
        type: 'dropShadow',
        color: { r: 0, g: 0, b: 0, a: 0.5 },
        offset: { x: 0, y: 4 },
        radius: 8,
        spread: 0,
        visible: true,
      }],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toContain('DropShadow');
    expect(result).toContain('drawForRectangle');
    // Shadow should come before fillRect
    const shadowIdx = result.indexOf('DropShadow');
    const fillIdx = result.indexOf('fillRect');
    expect(shadowIdx).toBeLessThan(fillIdx);
  });

  it('generates inner shadow after fills', () => {
    const rect = makeRect({
      fills: [{ type: 'solid', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
      effects: [{
        type: 'innerShadow',
        color: { r: 0, g: 0, b: 0, a: 0.3 },
        offset: { x: 0, y: 2 },
        radius: 4,
        spread: 0,
        visible: true,
      }],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toContain('Inner shadow');
    expect(result).toContain('saveState');
    expect(result).toContain('reduceClipRegion');
    expect(result).toContain('restoreState');
    // Inner shadow should come after fill
    const fillIdx = result.indexOf('fillRect');
    const innerIdx = result.indexOf('Inner shadow');
    expect(innerIdx).toBeGreaterThan(fillIdx);
  });

  it('generates blur comment placeholder', () => {
    const rect = makeRect({
      fills: [{ type: 'solid', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
      effects: [{
        type: 'layerBlur',
        radius: 10,
        visible: true,
      }],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toContain('Layer blur');
    expect(result).toContain('radius: 10px');
    expect(result).toContain('ImageConvolutionKernel');
  });

  it('generates background blur comment', () => {
    const rect = makeRect({
      effects: [{
        type: 'backgroundBlur',
        radius: 20,
        visible: true,
      }],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toContain('Background blur');
  });

  it('skips invisible effects', () => {
    const rect = makeRect({
      effects: [
        { type: 'innerShadow', color: { r: 0, g: 0, b: 0, a: 0.5 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0, visible: false },
        { type: 'layerBlur', radius: 10, visible: false },
      ],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).not.toContain('Inner shadow');
    expect(result).not.toContain('Layer blur');
  });

  it('generates stroke code', () => {
    const rect = makeRect({
      fills: [{ type: 'solid', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
      strokes: [{
        color: { r: 1, g: 0, b: 0, a: 1 },
        weight: 2,
        align: 'center',
        cap: 'none',
        join: 'miter',
        dashes: [],
        opacity: 1,
        visible: true,
      }],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toContain('drawRect');
    expect(result).toContain('2.0f');
  });

  it('generates stroke for rounded rect', () => {
    const rect = makeRect({
      cornerRadius: makeCornerRadius(8),
      strokes: [{
        color: { r: 0, g: 0, b: 0, a: 1 },
        weight: 1,
        align: 'center',
        cap: 'none',
        join: 'miter',
        dashes: [],
        opacity: 0.5,
        visible: true,
      }],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toContain('drawRoundedRectangle');
  });

  it('generates drawEllipse for ellipse stroke', () => {
    const ellipse = makeEllipse({
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
    const frame = makeFrame({ children: [ellipse] });
    const result = generatePaintBody(frame);

    expect(result).toContain('drawEllipse');
  });

  it('wraps in saveState/restoreState for opacity < 1', () => {
    const rect = makeRect({
      opacity: 0.5,
      fills: [{ type: 'solid', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toContain('g.saveState()');
    expect(result).toContain('g.setOpacity(0.5f)');
    expect(result).toContain('g.restoreState()');
  });

  it('skips invisible children', () => {
    const rect = makeRect({
      visible: false,
      fills: [{ type: 'solid', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toBe('');
  });

  it('skips invisible fills', () => {
    const rect = makeRect({
      fills: [{ type: 'solid', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: false }],
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).not.toContain('setColour');
    expect(result).not.toContain('fillRect');
  });

  it('handles per-corner radius via Path', () => {
    const rect = makeRect({
      fills: [{ type: 'solid', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
      cornerRadius: {
        topLeft: 10, topRight: 20, bottomRight: 30, bottomLeft: 40, isUniform: false,
      },
    });
    const frame = makeFrame({ children: [rect] });
    const result = generatePaintBody(frame);

    expect(result).toContain('juce::Path p;');
    expect(result).toContain('addRoundedRectangle');
    expect(result).toContain('fillPath');
    // Uses max radius (40.0f) as cornerSize, with boolean per-corner flags (all true since all > 0)
    expect(result).toContain('40.0f');
    expect(result).toContain('true, true');;
  });

  it('handles frame with background fill', () => {
    const frame = makeFrame({
      fills: [{ type: 'solid', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, opacity: 1, visible: true }],
    });
    const result = generatePaintBody(frame);

    expect(result).toContain('setColour');
    expect(result).toContain('fillRect');
    expect(result).toContain('getLocalBounds');
  });

  it('recurses into frame children', () => {
    const innerRect = makeRect({
      name: 'InnerRect',
      fills: [{ type: 'solid', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
    });
    const innerFrame = makeFrame({
      name: 'InnerFrame',
      type: 'frame',
      children: [innerRect],
      relativeX: 20,
      relativeY: 30,
      bounds: { x: 20, y: 30, width: 200, height: 150 },
    });
    const frame = makeFrame({ children: [innerFrame] });
    const result = generatePaintBody(frame);

    // Should have paint code for both inner frame and inner rect
    expect(result).toContain('fillRect');
  });
});
