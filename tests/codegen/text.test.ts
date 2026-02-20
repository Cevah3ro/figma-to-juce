import { describe, it, expect } from 'vitest';
import { generateTextDraw, buildFontExpression, mapJustification } from '../../src/codegen/text.js';
import type { IRTextNode, IRTextStyle } from '../../src/ir/types.js';

function makeTextStyle(overrides: Partial<IRTextStyle> = {}): IRTextStyle {
  return {
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 16,
    italic: false,
    letterSpacing: 0,
    lineHeight: 24,
    textAlignHorizontal: 'left',
    textAlignVertical: 'top',
    textDecoration: 'none',
    textCase: 'original',
    color: { r: 1, g: 1, b: 1, a: 1 },
    ...overrides,
  };
}

function makeTextNode(overrides: Partial<IRTextNode> = {}): IRTextNode {
  return {
    id: 't:1',
    name: 'TestText',
    type: 'text',
    visible: true,
    opacity: 1,
    bounds: { x: 10, y: 20, width: 200, height: 30 },
    relativeX: 10,
    relativeY: 20,
    fills: [],
    strokes: [],
    effects: [],
    blendMode: 'NORMAL',
    characters: 'Hello World',
    textStyle: makeTextStyle(),
    autoResize: 'widthAndHeight',
    ...overrides,
  };
}

// ─── buildFontExpression ────────────────────────────────────────────────────

describe('buildFontExpression', () => {
  it('generates basic font expression', () => {
    const result = buildFontExpression(makeTextStyle());
    expect(result).toContain('juce::Font');
    expect(result).toContain('16.0f');
  });

  it('adds boldened() for weight >= 700', () => {
    const result = buildFontExpression(makeTextStyle({ fontWeight: 700 }));
    expect(result).toContain('.boldened()');
  });

  it('does not add boldened() for weight < 700', () => {
    const result = buildFontExpression(makeTextStyle({ fontWeight: 400 }));
    expect(result).not.toContain('.boldened()');
  });

  it('adds italicised() for italic text', () => {
    const result = buildFontExpression(makeTextStyle({ italic: true }));
    expect(result).toContain('.italicised()');
  });

  it('adds both bold and italic', () => {
    const result = buildFontExpression(makeTextStyle({ fontWeight: 800, italic: true }));
    expect(result).toContain('.boldened()');
    expect(result).toContain('.italicised()');
  });
});

// ─── mapJustification ───────────────────────────────────────────────────────

describe('mapJustification', () => {
  it('maps left/top to topLeft', () => {
    expect(mapJustification('left', 'top')).toBe('juce::Justification::topLeft');
  });

  it('maps center/center to centred', () => {
    expect(mapJustification('center', 'center')).toBe('juce::Justification::centred');
  });

  it('maps right/bottom to bottomRight', () => {
    expect(mapJustification('right', 'bottom')).toBe('juce::Justification::bottomRight');
  });

  it('maps left/center to centredLeft', () => {
    expect(mapJustification('left', 'center')).toBe('juce::Justification::centredLeft');
  });

  it('maps center/top to centredTop', () => {
    expect(mapJustification('center', 'top')).toBe('juce::Justification::centredTop');
  });

  it('maps right/center to centredRight', () => {
    expect(mapJustification('right', 'center')).toBe('juce::Justification::centredRight');
  });

  it('maps center/bottom to centredBottom', () => {
    expect(mapJustification('center', 'bottom')).toBe('juce::Justification::centredBottom');
  });

  it('maps left/bottom to bottomLeft', () => {
    expect(mapJustification('left', 'bottom')).toBe('juce::Justification::bottomLeft');
  });

  it('maps right/top to topRight', () => {
    expect(mapJustification('right', 'top')).toBe('juce::Justification::topRight');
  });
});

// ─── generateTextDraw ───────────────────────────────────────────────────────

describe('generateTextDraw', () => {
  it('generates drawText for auto-resize text', () => {
    const node = makeTextNode();
    const lines = generateTextDraw(node, 'textBounds');
    const code = lines.join('\n');

    expect(code).toContain('g.setFont');
    expect(code).toContain('g.setColour');
    expect(code).toContain('g.drawText');
    expect(code).toContain('"Hello World"');
    expect(code).toContain('textBounds');
  });

  it('generates drawFittedText for fixed-size text', () => {
    const node = makeTextNode({ autoResize: 'none' });
    const lines = generateTextDraw(node, 'textBounds');
    const code = lines.join('\n');

    expect(code).toContain('drawFittedText');
    expect(code).toContain('toNearestInt');
  });

  it('generates drawFittedText for truncated text', () => {
    const node = makeTextNode({ autoResize: 'truncate' });
    const lines = generateTextDraw(node, 'textBounds');
    const code = lines.join('\n');

    expect(code).toContain('drawFittedText');
  });

  it('estimates max lines from lineHeight', () => {
    // height=30, lineHeight=24 → 1 line
    const node = makeTextNode({
      autoResize: 'none',
      bounds: { x: 0, y: 0, width: 200, height: 72 },
      textStyle: makeTextStyle({ lineHeight: 24 }),
    });
    const lines = generateTextDraw(node, 'textBounds');
    const code = lines.join('\n');

    // 72 / 24 = 3 lines
    expect(code).toContain(', 3);');
  });

  it('escapes special characters in text', () => {
    const node = makeTextNode({ characters: 'He said "hello"\nnewline' });
    const lines = generateTextDraw(node, 'textBounds');
    const code = lines.join('\n');

    expect(code).toContain('\\"hello\\"');
    expect(code).toContain('\\n');
  });

  it('uses correct justification', () => {
    const node = makeTextNode({
      textStyle: makeTextStyle({
        textAlignHorizontal: 'center',
        textAlignVertical: 'center',
      }),
    });
    const lines = generateTextDraw(node, 'textBounds');
    const code = lines.join('\n');

    expect(code).toContain('juce::Justification::centred');
  });

  it('sets bold font for heavy weight', () => {
    const node = makeTextNode({
      textStyle: makeTextStyle({ fontWeight: 700 }),
    });
    const lines = generateTextDraw(node, 'textBounds');
    const code = lines.join('\n');

    expect(code).toContain('.boldened()');
  });
});
