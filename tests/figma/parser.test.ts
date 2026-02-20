import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFigmaFile, parseFigmaNode } from '../../src/figma/parser.js';
import type { FigmaFileResponse, FigmaNode } from '../../src/figma/types.js';
import type {
  IRFrameNode,
  IRRectangleNode,
  IREllipseNode,
  IRTextNode,
  IRVectorNode,
  IRGroupNode,
} from '../../src/ir/types.js';

function loadFixture(name: string): FigmaFileResponse {
  const path = resolve(__dirname, '../fixtures', name);
  return JSON.parse(readFileSync(path, 'utf-8')) as FigmaFileResponse;
}

// ─── parseFigmaFile: Simple Rectangle fixture ──────────────────────────────

describe('parseFigmaFile — simple-rect.json', () => {
  const fixture = loadFixture('simple-rect.json');
  const doc = parseFigmaFile(fixture);

  it('parses document name', () => {
    expect(doc.name).toBe('Simple Rectangle Test');
  });

  it('parses one page', () => {
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0].name).toBe('Page 1');
  });

  it('parses page background color', () => {
    expect(doc.pages[0].backgroundColor).toEqual({
      r: 0.96, g: 0.96, b: 0.96, a: 1.0,
    });
  });

  it('parses the top-level frame', () => {
    const page = doc.pages[0];
    expect(page.children).toHaveLength(1);

    const frame = page.children[0] as IRFrameNode;
    expect(frame.type).toBe('frame');
    expect(frame.name).toBe('PluginBackground');
    expect(frame.bounds).toEqual({ x: 0, y: 0, width: 600, height: 400 });
    expect(frame.clipsContent).toBe(true);
  });

  it('skips invisible nodes', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    // Frame has 3 children in JSON, but "Hidden Element" (visible:false) should be skipped
    expect(frame.children).toHaveLength(2);
    const names = frame.children.map((c) => c.name);
    expect(names).not.toContain('Hidden Element');
  });

  it('parses rectangle with solid fill', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const panel = frame.children[0] as IRRectangleNode;

    expect(panel.type).toBe('rectangle');
    expect(panel.name).toBe('Panel');
    expect(panel.bounds).toEqual({ x: 20, y: 20, width: 560, height: 360 });

    // Solid fill
    expect(panel.fills).toHaveLength(1);
    expect(panel.fills[0].type).toBe('solid');
    if (panel.fills[0].type === 'solid') {
      expect(panel.fills[0].color.r).toBeCloseTo(0.15, 2);
      expect(panel.fills[0].color.a).toBe(1.0);
    }
  });

  it('parses corner radius', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const panel = frame.children[0] as IRRectangleNode;

    expect(panel.cornerRadius.isUniform).toBe(true);
    expect(panel.cornerRadius.topLeft).toBe(12);
    expect(panel.cornerRadius.bottomRight).toBe(12);
  });

  it('parses stroke', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const panel = frame.children[0] as IRRectangleNode;

    expect(panel.strokes).toHaveLength(1);
    expect(panel.strokes[0].weight).toBe(1);
    expect(panel.strokes[0].align).toBe('inside');
    expect(panel.strokes[0].color).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(panel.strokes[0].opacity).toBe(0.3);
  });

  it('parses drop shadow effect', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const panel = frame.children[0] as IRRectangleNode;

    expect(panel.effects).toHaveLength(1);
    expect(panel.effects[0].type).toBe('dropShadow');
    if (panel.effects[0].type === 'dropShadow') {
      expect(panel.effects[0].radius).toBe(12);
      expect(panel.effects[0].offset).toEqual({ x: 0, y: 4 });
      expect(panel.effects[0].color.a).toBe(0.4);
    }
  });

  it('parses linear gradient fill', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const accent = frame.children[1] as IRRectangleNode;

    expect(accent.name).toBe('Accent Line');
    expect(accent.fills).toHaveLength(1);
    expect(accent.fills[0].type).toBe('linearGradient');

    if (accent.fills[0].type === 'linearGradient') {
      expect(accent.fills[0].start).toEqual({ x: 0, y: 0.5 });
      expect(accent.fills[0].end).toEqual({ x: 1, y: 0.5 });
      expect(accent.fills[0].stops).toHaveLength(2);
      expect(accent.fills[0].stops[0].position).toBe(0);
      expect(accent.fills[0].stops[1].position).toBe(1);
    }
  });

  it('computes relative position from parent', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const panel = frame.children[0] as IRRectangleNode;

    // Panel is at absolute (20,20), parent frame at (0,0)
    expect(panel.relativeX).toBe(20);
    expect(panel.relativeY).toBe(20);
  });

  it('parses constraints', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const panel = frame.children[0] as IRRectangleNode;

    expect(panel.constraints).toEqual({
      horizontal: 'leftRight',
      vertical: 'topBottom',
    });
  });

  it('parses frame fill', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    expect(frame.fills).toHaveLength(1);
    expect(frame.fills[0].type).toBe('solid');
    if (frame.fills[0].type === 'solid') {
      expect(frame.fills[0].color.r).toBeCloseTo(0.11, 2);
    }
  });
});

// ─── parseFigmaFile: Text Styles fixture ────────────────────────────────────

describe('parseFigmaFile — text-styles.json', () => {
  const fixture = loadFixture('text-styles.json');
  const doc = parseFigmaFile(fixture);

  it('parses document with text nodes', () => {
    expect(doc.name).toBe('Text Styles Test');
    expect(doc.pages).toHaveLength(1);
  });

  it('parses bold centered title', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const title = frame.children[0] as IRTextNode;

    expect(title.type).toBe('text');
    expect(title.characters).toBe('ARES COMPRESSOR');

    expect(title.textStyle.fontFamily).toBe('Inter');
    expect(title.textStyle.fontWeight).toBe(700);
    expect(title.textStyle.fontSize).toBe(28);
    expect(title.textStyle.textAlignHorizontal).toBe('center');
    expect(title.textStyle.textAlignVertical).toBe('center');
    expect(title.textStyle.letterSpacing).toBe(4); // 4px
    expect(title.textStyle.lineHeight).toBe(36);
    expect(title.textStyle.textCase).toBe('upper');
    expect(title.textStyle.textDecoration).toBe('none');
  });

  it('parses text color from style fills', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const title = frame.children[0] as IRTextNode;

    expect(title.textStyle.color).toEqual({ r: 1, g: 1, b: 1, a: 1 });
  });

  it('parses italic text with percent letter spacing', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const subtitle = frame.children[1] as IRTextNode;

    expect(subtitle.characters).toBe('Analog-Style Dynamics Processor');
    expect(subtitle.textStyle.italic).toBe(true);
    expect(subtitle.textStyle.fontWeight).toBe(400);
    // 2% of 14px fontSize = 0.28px
    expect(subtitle.textStyle.letterSpacing).toBeCloseTo(0.28, 2);
    expect(subtitle.opacity).toBe(0.6);
  });

  it('parses textAutoResize', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const title = frame.children[0] as IRTextNode;
    expect(title.autoResize).toBe('widthAndHeight');

    const subtitle = frame.children[1] as IRTextNode;
    expect(subtitle.autoResize).toBe('height');

    const value = frame.children[3] as IRTextNode;
    expect(value.autoResize).toBe('none');
  });

  it('parses underline text decoration', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const value = frame.children[3] as IRTextNode;

    expect(value.textStyle.textDecoration).toBe('underline');
    expect(value.textStyle.textAlignHorizontal).toBe('right');
    expect(value.textStyle.textAlignVertical).toBe('bottom');
  });

  it('parses monospace font', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const label = frame.children[2] as IRTextNode;

    expect(label.textStyle.fontFamily).toBe('JetBrains Mono');
    expect(label.textStyle.fontWeight).toBe(500);
    expect(label.textStyle.fontSize).toBe(11);
  });

  it('parses ellipse with radial gradient', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const knob = frame.children[4] as IREllipseNode;

    expect(knob.type).toBe('ellipse');
    expect(knob.name).toBe('KnobBg');
    expect(knob.bounds).toEqual({ x: 160, y: 200, width: 80, height: 80 });

    expect(knob.fills).toHaveLength(1);
    expect(knob.fills[0].type).toBe('radialGradient');
    if (knob.fills[0].type === 'radialGradient') {
      expect(knob.fills[0].center).toEqual({ x: 0.5, y: 0.5 });
      expect(knob.fills[0].stops).toHaveLength(2);
    }
  });

  it('parses inner shadow effect', () => {
    const frame = doc.pages[0].children[0] as IRFrameNode;
    const knob = frame.children[4] as IREllipseNode;

    expect(knob.effects).toHaveLength(1);
    expect(knob.effects[0].type).toBe('innerShadow');
    if (knob.effects[0].type === 'innerShadow') {
      expect(knob.effects[0].color.a).toBe(0.1);
      expect(knob.effects[0].offset).toEqual({ x: 0, y: 1 });
      expect(knob.effects[0].radius).toBe(2);
    }
  });
});

// ─── parseFigmaFile: Auto Layout fixture ────────────────────────────────────

describe('parseFigmaFile — auto-layout-frame.json', () => {
  const fixture = loadFixture('auto-layout-frame.json');
  const doc = parseFigmaFile(fixture);

  it('parses auto-layout frame', () => {
    const panel = doc.pages[0].children[0] as IRFrameNode;

    expect(panel.type).toBe('frame');
    expect(panel.name).toBe('ControlPanel');
    expect(panel.autoLayout).toBeDefined();
  });

  it('parses horizontal auto-layout properties', () => {
    const panel = doc.pages[0].children[0] as IRFrameNode;
    const al = panel.autoLayout!;

    expect(al.mode).toBe('horizontal');
    expect(al.primaryAxisAlign).toBe('spaceBetween');
    expect(al.counterAxisAlign).toBe('center');
    expect(al.paddingLeft).toBe(24);
    expect(al.paddingRight).toBe(24);
    expect(al.paddingTop).toBe(16);
    expect(al.paddingBottom).toBe(16);
    expect(al.itemSpacing).toBe(16);
    expect(al.primaryAxisSizing).toBe('fixed');
    expect(al.counterAxisSizing).toBe('fixed');
    expect(al.wrap).toBe(false);
  });

  it('parses nested vertical auto-layout', () => {
    const panel = doc.pages[0].children[0] as IRFrameNode;
    const knobGroup = panel.children[0] as IRFrameNode;

    expect(knobGroup.type).toBe('frame');
    expect(knobGroup.autoLayout).toBeDefined();
    expect(knobGroup.autoLayout!.mode).toBe('vertical');
    expect(knobGroup.autoLayout!.primaryAxisAlign).toBe('center');
    expect(knobGroup.autoLayout!.counterAxisAlign).toBe('center');
    expect(knobGroup.autoLayout!.itemSpacing).toBe(8);
    expect(knobGroup.autoLayout!.primaryAxisSizing).toBe('auto');
    expect(knobGroup.autoLayout!.counterAxisSizing).toBe('fixed');
  });

  it('parses child layoutAlign and layoutGrow', () => {
    const panel = doc.pages[0].children[0] as IRFrameNode;
    const knobGroup = panel.children[0] as IRFrameNode;

    expect(knobGroup.layoutAlign).toBe('stretch');
    expect(knobGroup.layoutGrow).toBe(1);
  });

  it('parses LINE node as vector with stroke geometry', () => {
    const panel = doc.pages[0].children[0] as IRFrameNode;
    const divider = panel.children[1] as IRVectorNode;

    expect(divider.type).toBe('line');
    expect(divider.name).toBe('Divider');
    expect(divider.opacity).toBe(0.3);
    expect(divider.paths).toHaveLength(1);
    expect(divider.paths[0].path).toBe('M 0 0 L 0 72');
    expect(divider.paths[0].windingRule).toBe('nonzero');
  });

  it('parses COMPONENT node as component type', () => {
    const panel = doc.pages[0].children[0] as IRFrameNode;
    const buttonRow = panel.children[2] as IRFrameNode;

    expect(buttonRow.type).toBe('component');
    expect(buttonRow.name).toBe('ButtonRow');
    expect(buttonRow.autoLayout).toBeDefined();
    expect(buttonRow.autoLayout!.mode).toBe('horizontal');
    expect(buttonRow.autoLayout!.itemSpacing).toBe(12);
  });

  it('parses INSTANCE nodes with componentId', () => {
    const panel = doc.pages[0].children[0] as IRFrameNode;
    const buttonRow = panel.children[2] as IRFrameNode;
    const bypass = buttonRow.children[0] as IRFrameNode;

    expect(bypass.type).toBe('instance');
    expect(bypass.name).toBe('Btn Bypass');
    expect(bypass.componentId).toBe('comp:bypass-btn');
    expect(bypass.cornerRadius.topLeft).toBe(6);
  });

  it('parses deeply nested text inside instances', () => {
    const panel = doc.pages[0].children[0] as IRFrameNode;
    const buttonRow = panel.children[2] as IRFrameNode;
    const bypass = buttonRow.children[0] as IRFrameNode;
    const label = bypass.children[0] as IRTextNode;

    expect(label.type).toBe('text');
    expect(label.characters).toBe('BYPASS');
    expect(label.textStyle.fontFamily).toBe('Inter');
    expect(label.textStyle.fontWeight).toBe(600);
  });

  it('frame without auto-layout has no autoLayout', () => {
    // The top-level frame has auto-layout, but let's test an arbitrary sub-node
    const panel = doc.pages[0].children[0] as IRFrameNode;
    const buttonRow = panel.children[2] as IRFrameNode;
    const bypass = buttonRow.children[0] as IRFrameNode;
    // Instance nodes inside buttonRow have no layoutMode of their own
    // (they inherit parent's auto-layout but don't define one)
    // Our fixture doesn't set layoutMode on instances, so autoLayout should be undefined
    expect(bypass.autoLayout).toBeUndefined();
  });

  it('parses ellipse with stroke and drop shadow', () => {
    const panel = doc.pages[0].children[0] as IRFrameNode;
    const knobGroup = panel.children[0] as IRFrameNode;
    const knob = knobGroup.children[1] as IREllipseNode;

    expect(knob.type).toBe('ellipse');
    expect(knob.strokes).toHaveLength(1);
    expect(knob.strokes[0].weight).toBe(2);
    expect(knob.strokes[0].align).toBe('outside');
    expect(knob.effects).toHaveLength(1);
    expect(knob.effects[0].type).toBe('dropShadow');
  });
});

// ─── parseFigmaNode ─────────────────────────────────────────────────────────

describe('parseFigmaNode', () => {
  it('parses a standalone rectangle node', () => {
    const node: FigmaNode = {
      id: '99:1',
      name: 'TestRect',
      type: 'RECTANGLE',
      visible: true,
      opacity: 0.8,
      blendMode: 'NORMAL',
      absoluteBoundingBox: { x: 10, y: 20, width: 100, height: 50 },
      fills: [
        { type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 0, b: 0, a: 1 } },
      ],
      strokes: [],
      effects: [],
      cornerRadius: 4,
    };

    const ir = parseFigmaNode(node) as IRRectangleNode;
    expect(ir).not.toBeNull();
    expect(ir.type).toBe('rectangle');
    expect(ir.name).toBe('TestRect');
    expect(ir.opacity).toBe(0.8);
    expect(ir.bounds.width).toBe(100);
    expect(ir.cornerRadius.topLeft).toBe(4);
    expect(ir.cornerRadius.isUniform).toBe(true);
    expect(ir.fills[0].type).toBe('solid');
  });

  it('returns null for DOCUMENT node', () => {
    const node: FigmaNode = {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: [],
    };
    expect(parseFigmaNode(node)).toBeNull();
  });

  it('returns null for invisible node', () => {
    const node: FigmaNode = {
      id: '99:2',
      name: 'InvisibleRect',
      type: 'RECTANGLE',
      visible: false,
      absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
      fills: [],
      strokes: [],
      effects: [],
      cornerRadius: 0,
    };
    expect(parseFigmaNode(node)).toBeNull();
  });

  it('parses a text node standalone', () => {
    const node: FigmaNode = {
      id: '99:3',
      name: 'Label',
      type: 'TEXT',
      visible: true,
      opacity: 1,
      blendMode: 'NORMAL',
      absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 30 },
      fills: [],
      strokes: [],
      effects: [],
      characters: 'Hello World',
      style: {
        fontFamily: 'Arial',
        fontWeight: 400,
        fontSize: 16,
        textAlignHorizontal: 'LEFT',
        textAlignVertical: 'TOP',
        letterSpacing: { value: 0, unit: 'PIXELS' },
        lineHeightPx: 24,
        lineHeightUnit: 'PIXELS',
        fills: [
          { type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } },
        ],
      },
    };

    const ir = parseFigmaNode(node) as IRTextNode;
    expect(ir).not.toBeNull();
    expect(ir.type).toBe('text');
    expect(ir.characters).toBe('Hello World');
    expect(ir.textStyle.fontFamily).toBe('Arial');
    expect(ir.textStyle.fontSize).toBe(16);
    expect(ir.textStyle.color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it('handles node with no fills/strokes/effects gracefully', () => {
    const node: FigmaNode = {
      id: '99:4',
      name: 'EmptyEllipse',
      type: 'ELLIPSE',
      visible: true,
      absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 50 },
    } as FigmaNode;

    const ir = parseFigmaNode(node) as IREllipseNode;
    expect(ir).not.toBeNull();
    expect(ir.type).toBe('ellipse');
    expect(ir.fills).toEqual([]);
    expect(ir.strokes).toEqual([]);
    expect(ir.effects).toEqual([]);
  });

  it('parses individual corner radii', () => {
    const node: FigmaNode = {
      id: '99:5',
      name: 'AsymRect',
      type: 'RECTANGLE',
      visible: true,
      absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 80 },
      fills: [],
      strokes: [],
      effects: [],
      cornerRadius: 10,
      rectangleCornerRadii: [10, 20, 30, 40],
    };

    const ir = parseFigmaNode(node) as IRRectangleNode;
    expect(ir.cornerRadius.isUniform).toBe(false);
    expect(ir.cornerRadius.topLeft).toBe(10);
    expect(ir.cornerRadius.topRight).toBe(20);
    expect(ir.cornerRadius.bottomRight).toBe(30);
    expect(ir.cornerRadius.bottomLeft).toBe(40);
  });

  it('parses image fill', () => {
    const node: FigmaNode = {
      id: '99:6',
      name: 'ImageRect',
      type: 'RECTANGLE',
      visible: true,
      absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
      fills: [
        {
          type: 'IMAGE',
          visible: true,
          opacity: 0.9,
          imageRef: 'abc123hash',
          scaleMode: 'FIT',
        },
      ],
      strokes: [],
      effects: [],
      cornerRadius: 0,
    };

    const ir = parseFigmaNode(node) as IRRectangleNode;
    expect(ir.fills).toHaveLength(1);
    expect(ir.fills[0].type).toBe('image');
    if (ir.fills[0].type === 'image') {
      expect(ir.fills[0].imageRef).toBe('abc123hash');
      expect(ir.fills[0].scaleMode).toBe('fit');
      expect(ir.fills[0].opacity).toBe(0.9);
    }
  });

  it('parses GROUP node with children', () => {
    const node: FigmaNode = {
      id: '99:7',
      name: 'MyGroup',
      type: 'GROUP',
      visible: true,
      opacity: 1,
      blendMode: 'PASS_THROUGH',
      absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
      fills: [],
      strokes: [],
      effects: [],
      children: [
        {
          id: '99:8',
          name: 'ChildRect',
          type: 'RECTANGLE',
          visible: true,
          absoluteBoundingBox: { x: 10, y: 10, width: 50, height: 50 },
          fills: [],
          strokes: [],
          effects: [],
          cornerRadius: 0,
        },
      ],
    };

    const ir = parseFigmaNode(node) as IRGroupNode;
    expect(ir).not.toBeNull();
    expect(ir.type).toBe('group');
    expect(ir.children).toHaveLength(1);
    expect(ir.children[0].type).toBe('rectangle');
    // Child relative to group
    expect(ir.children[0].relativeX).toBe(10);
    expect(ir.children[0].relativeY).toBe(10);
  });

  it('parses VECTOR node with path geometry', () => {
    const node: FigmaNode = {
      id: '99:9',
      name: 'Arrow',
      type: 'VECTOR',
      visible: true,
      opacity: 1,
      blendMode: 'NORMAL',
      absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
      fills: [
        { type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } },
      ],
      strokes: [],
      effects: [],
      fillGeometry: [
        { path: 'M 0 12 L 24 12 M 18 6 L 24 12 L 18 18', windingRule: 'NONZERO' },
      ],
    };

    const ir = parseFigmaNode(node) as IRVectorNode;
    expect(ir).not.toBeNull();
    expect(ir.type).toBe('vector');
    expect(ir.paths).toHaveLength(1);
    expect(ir.paths[0].path).toContain('M 0 12');
    expect(ir.paths[0].windingRule).toBe('nonzero');
  });

  it('parses BOOLEAN_OPERATION node', () => {
    const node: FigmaNode = {
      id: '99:10',
      name: 'Union Shape',
      type: 'BOOLEAN_OPERATION',
      visible: true,
      opacity: 1,
      blendMode: 'NORMAL',
      absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
      booleanOperation: 'UNION',
      fills: [],
      strokes: [],
      effects: [],
      fillGeometry: [
        { path: 'M 0 0 L 100 0 L 100 100 Z', windingRule: 'EVENODD' },
      ],
      children: [],
    };

    const ir = parseFigmaNode(node) as IRVectorNode;
    expect(ir).not.toBeNull();
    expect(ir.type).toBe('booleanOperation');
    expect(ir.booleanOperation).toBe('union');
    expect(ir.paths).toHaveLength(1);
    expect(ir.paths[0].windingRule).toBe('evenodd');
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe('parser edge cases', () => {
  it('handles missing optional fields with defaults', () => {
    const node: FigmaNode = {
      id: 'edge:1',
      name: 'Minimal',
      type: 'RECTANGLE',
      // No visible, opacity, blendMode, fills, strokes, effects, constraints
      absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
    } as FigmaNode;

    const ir = parseFigmaNode(node) as IRRectangleNode;
    expect(ir).not.toBeNull();
    expect(ir.visible).toBe(true);
    expect(ir.opacity).toBe(1);
    expect(ir.blendMode).toBe('PASS_THROUGH');
    expect(ir.fills).toEqual([]);
    expect(ir.strokes).toEqual([]);
    expect(ir.effects).toEqual([]);
    expect(ir.constraints).toBeUndefined();
  });

  it('handles unsupported fill types by skipping', () => {
    const node: FigmaNode = {
      id: 'edge:2',
      name: 'EmojiRect',
      type: 'RECTANGLE',
      visible: true,
      absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 50 },
      fills: [
        { type: 'EMOJI' } as FigmaNode extends never ? never : { type: 'EMOJI' } as unknown as import('../../src/figma/types.js').FigmaPaint,
        { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } },
      ],
      strokes: [],
      effects: [],
      cornerRadius: 0,
    } as unknown as FigmaNode;

    const ir = parseFigmaNode(node) as IRRectangleNode;
    // EMOJI fill should be skipped, only the SOLID fill remains
    expect(ir.fills).toHaveLength(1);
    expect(ir.fills[0].type).toBe('solid');
  });

  it('uses size fallback when absoluteBoundingBox is missing', () => {
    const node: FigmaNode = {
      id: 'edge:3',
      name: 'SizeOnly',
      type: 'RECTANGLE',
      visible: true,
      size: { x: 200, y: 100 },
      fills: [],
      strokes: [],
      effects: [],
      cornerRadius: 0,
    } as unknown as FigmaNode;

    const ir = parseFigmaNode(node) as IRRectangleNode;
    expect(ir.bounds).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });
});
