import { describe, it, expect } from 'vitest';
import {
  generateFromDocument,
  generateFromPage,
  generateComponent,
} from '../../src/codegen/generator.js';
import type {
  IRDocument,
  IRPage,
  IRFrameNode,
  IRRectangleNode,
  IRCornerRadius,
} from '../../src/ir/types.js';

function makeCornerRadius(r: number): IRCornerRadius {
  return { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r, isUniform: true };
}

function makeRect(overrides: Partial<IRRectangleNode> = {}): IRRectangleNode {
  return {
    id: 'r:1',
    name: 'Panel',
    type: 'rectangle',
    visible: true,
    opacity: 1,
    bounds: { x: 10, y: 10, width: 380, height: 280 },
    relativeX: 10,
    relativeY: 10,
    fills: [{ type: 'solid', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [],
    blendMode: 'NORMAL',
    cornerRadius: makeCornerRadius(8),
    ...overrides,
  };
}

function makeFrame(overrides: Partial<IRFrameNode> = {}): IRFrameNode {
  return {
    id: 'f:1',
    name: 'PluginEditor',
    type: 'frame',
    visible: true,
    opacity: 1,
    bounds: { x: 0, y: 0, width: 400, height: 300 },
    relativeX: 0,
    relativeY: 0,
    fills: [{ type: 'solid', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, opacity: 1, visible: true }],
    strokes: [],
    effects: [],
    blendMode: 'NORMAL',
    children: [makeRect()],
    cornerRadius: makeCornerRadius(0),
    clipsContent: true,
    ...overrides,
  };
}

function makePage(overrides: Partial<IRPage> = {}): IRPage {
  return {
    id: 'p:1',
    name: 'Page 1',
    backgroundColor: { r: 0.96, g: 0.96, b: 0.96, a: 1 },
    children: [makeFrame()],
    ...overrides,
  };
}

function makeDocument(overrides: Partial<IRDocument> = {}): IRDocument {
  return {
    name: 'Test Design',
    pages: [makePage()],
    ...overrides,
  };
}

// ─── generateComponent ──────────────────────────────────────────────────────

describe('generateComponent', () => {
  it('generates a component with correct class name', () => {
    const frame = makeFrame();
    const result = generateComponent(frame);

    expect(result.className).toBe('PluginEditor');
  });

  it('generates header and implementation files', () => {
    const frame = makeFrame();
    const result = generateComponent(frame);

    expect(result.header.fileName).toBe('PluginEditor.h');
    expect(result.implementation.fileName).toBe('PluginEditor.cpp');
  });

  it('header contains class declaration', () => {
    const frame = makeFrame();
    const result = generateComponent(frame);

    expect(result.header.content).toContain('#pragma once');
    expect(result.header.content).toContain('class PluginEditor');
    expect(result.header.content).toContain('void paint');
    expect(result.header.content).toContain('void resized');
  });

  it('implementation includes the header', () => {
    const frame = makeFrame();
    const result = generateComponent(frame);

    expect(result.implementation.content).toContain('#include "PluginEditor.h"');
  });

  it('implementation contains paint body with fill code', () => {
    const frame = makeFrame();
    const result = generateComponent(frame);

    expect(result.implementation.content).toContain('setColour');
    expect(result.implementation.content).toContain('fillR');
  });

  it('implementation contains resized body', () => {
    const frame = makeFrame();
    const result = generateComponent(frame);

    expect(result.implementation.content).toContain('getLocalBounds');
  });

  it('handles frame with no children', () => {
    const frame = makeFrame({ children: [] });
    const result = generateComponent(frame);

    expect(result.header.content).toContain('class PluginEditor');
    expect(result.implementation.content).toContain('PluginEditor::paint');
  });
});

// ─── generateFromPage ───────────────────────────────────────────────────────

describe('generateFromPage', () => {
  it('generates components for each top-level frame', () => {
    const page = makePage({
      children: [
        makeFrame({ name: 'MainEditor' }),
        makeFrame({ name: 'Settings Panel', id: 'f:2' }),
      ],
    });
    const result = generateFromPage(page);

    expect(result).toHaveLength(2);
    expect(result[0].className).toBe('MainEditor');
    expect(result[1].className).toBe('SettingsPanel');
  });

  it('skips non-frame top-level nodes', () => {
    const page = makePage({
      children: [
        makeFrame(),
        makeRect() as unknown as IRFrameNode, // rectangle at top level
      ],
    });
    const result = generateFromPage(page);

    // Only the frame should be generated
    expect(result).toHaveLength(1);
  });
});

// ─── generateFromDocument ───────────────────────────────────────────────────

describe('generateFromDocument', () => {
  it('generates components from all pages', () => {
    const doc = makeDocument({
      pages: [
        makePage({ children: [makeFrame({ name: 'Page1Component' })] }),
        makePage({ children: [makeFrame({ name: 'Page2Component', id: 'f:3' })] }),
      ],
    });
    const result = generateFromDocument(doc);

    expect(result).toHaveLength(2);
    expect(result[0].className).toBe('Page1Component');
    expect(result[1].className).toBe('Page2Component');
  });

  it('returns empty array for document with no frames', () => {
    const doc = makeDocument({
      pages: [makePage({ children: [] })],
    });
    const result = generateFromDocument(doc);

    expect(result).toHaveLength(0);
  });

  it('generates valid C++ header syntax', () => {
    const doc = makeDocument();
    const result = generateFromDocument(doc);

    const header = result[0].header.content;
    // Check basic C++ syntax patterns
    expect(header).toMatch(/#pragma once/);
    expect(header).toMatch(/class \w+ : public juce::Component/);
    expect(header).toMatch(/public:/);
    expect(header).toMatch(/private:/);
  });

  it('generates valid C++ implementation syntax', () => {
    const doc = makeDocument();
    const result = generateFromDocument(doc);

    const impl = result[0].implementation.content;
    expect(impl).toMatch(/#include "/);
    expect(impl).toMatch(/void \w+::paint\(juce::Graphics& g\)/);
    expect(impl).toMatch(/void \w+::resized\(\)/);
  });
});
