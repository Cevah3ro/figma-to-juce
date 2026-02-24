import { describe, it, expect } from 'vitest';
import {
  generateFromDocument,
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
    name: 'Background',
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
    name: 'MainEditor',
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
    children: [],
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
    children: [],
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

// ─── Nested Component Tests ─────────────────────────────────────────────────

describe('Nested Components', () => {
  it('generates separate component classes for nested frames', () => {
    const childFrame = makeFrame({
      id: 'f:child',
      name: 'ControlPanel',
      bounds: { x: 20, y: 20, width: 200, height: 100 },
      relativeX: 20,
      relativeY: 20,
      children: [makeRect({ id: 'r:child', relativeX: 10, relativeY: 10 })],
    });

    const parentFrame = makeFrame({
      name: 'PluginEditor',
      children: [childFrame, makeRect({ id: 'r:bg', relativeX: 0, relativeY: 0 })],
    });

    const doc = makeDocument({
      pages: [makePage({ children: [parentFrame] })],
    });

    const components = generateFromDocument(doc);

    // Should generate 2 components: ControlPanel and PluginEditor
    expect(components).toHaveLength(2);
    expect(components.map(c => c.className).sort()).toEqual(['ControlPanel', 'PluginEditor']);
  });

  it('parent component includes child component as member variable', () => {
    const childFrame = makeFrame({
      id: 'f:child',
      name: 'ButtonGroup',
      bounds: { x: 50, y: 50, width: 100, height: 40 },
      relativeX: 50,
      relativeY: 50,
      children: [],
    });

    const parentFrame = makeFrame({
      name: 'MainPanel',
      children: [childFrame],
    });

    const component = generateComponent(parentFrame);

    // Header should declare the child component member
    expect(component.header.content).toContain('ButtonGroup buttonGroup');
    expect(component.header.content).toContain('nested component');
  });

  it('parent constructor calls addAndMakeVisible for child component', () => {
    const childFrame = makeFrame({
      id: 'f:child',
      name: 'Knob Panel',
      bounds: { x: 30, y: 30, width: 150, height: 80 },
      relativeX: 30,
      relativeY: 30,
      children: [],
    });

    const parentFrame = makeFrame({
      name: 'Editor',
      children: [childFrame],
    });

    const component = generateComponent(parentFrame);

    // Implementation should call addAndMakeVisible
    expect(component.implementation.content).toContain('addAndMakeVisible(knobPanel)');
  });

  it('parent resized() calls setBounds on child component (absolute layout)', () => {
    const childFrame = makeFrame({
      id: 'f:child',
      name: 'Section',
      bounds: { x: 10, y: 10, width: 380, height: 100 },
      relativeX: 10,
      relativeY: 10,
      children: [],
    });

    const parentFrame = makeFrame({
      name: 'Container',
      bounds: { x: 0, y: 0, width: 400, height: 200 },
      children: [childFrame],
    });

    const component = generateComponent(parentFrame);

    // resized() should calculate bounds and call setBounds
    expect(component.implementation.content).toContain('sectionBounds');
    expect(component.implementation.content).toContain('section.setBounds');
  });

  it('supports multiple levels of nesting', () => {
    const grandchildFrame = makeFrame({
      id: 'f:gc',
      name: 'Button',
      bounds: { x: 10, y: 10, width: 50, height: 30 },
      relativeX: 10,
      relativeY: 10,
      children: [],
    });

    const childFrame = makeFrame({
      id: 'f:child',
      name: 'Panel',
      bounds: { x: 20, y: 20, width: 100, height: 80 },
      relativeX: 20,
      relativeY: 20,
      children: [grandchildFrame],
    });

    const parentFrame = makeFrame({
      name: 'Window',
      children: [childFrame],
    });

    const doc = makeDocument({
      pages: [makePage({ children: [parentFrame] })],
    });

    const components = generateFromDocument(doc);

    // Should generate 3 components: Button, Panel, Window
    expect(components).toHaveLength(3);
    expect(components.map(c => c.className).sort()).toEqual(['Button', 'Panel', 'Window']);
    
    // Panel should contain Button as a member
    const panelComp = components.find(c => c.className === 'Panel');
    expect(panelComp?.header.content).toContain('Button button');
    
    // Window should contain Panel as a member
    const windowComp = components.find(c => c.className === 'Window');
    expect(windowComp?.header.content).toContain('Panel panel');
  });

  it('does not generate components for non-frame children', () => {
    const parentFrame = makeFrame({
      name: 'Editor',
      children: [
        makeRect({ id: 'r:1', name: 'Rect 1' }),
        makeRect({ id: 'r:2', name: 'Rect 2' }),
      ],
    });

    const doc = makeDocument({
      pages: [makePage({ children: [parentFrame] })],
    });

    const components = generateFromDocument(doc);

    // Should generate only 1 component: Editor
    expect(components).toHaveLength(1);
    expect(components[0].className).toBe('Editor');
  });

  it('ignores invisible nested frames', () => {
    const visibleChild = makeFrame({
      id: 'f:visible',
      name: 'VisiblePanel',
      bounds: { x: 10, y: 10, width: 100, height: 50 },
      relativeX: 10,
      relativeY: 10,
      visible: true,
      children: [],
    });

    const invisibleChild = makeFrame({
      id: 'f:invisible',
      name: 'HiddenPanel',
      bounds: { x: 120, y: 10, width: 100, height: 50 },
      relativeX: 120,
      relativeY: 10,
      visible: false,
      children: [],
    });

    const parentFrame = makeFrame({
      name: 'Container',
      children: [visibleChild, invisibleChild],
    });

    const doc = makeDocument({
      pages: [makePage({ children: [parentFrame] })],
    });

    const components = generateFromDocument(doc);

    // Should generate 2 components: VisiblePanel and Container (not HiddenPanel)
    expect(components).toHaveLength(2);
    expect(components.map(c => c.className).sort()).toEqual(['Container', 'VisiblePanel']);
  });

  it('handles component and instance types as nested components', () => {
    const instanceChild: IRFrameNode = {
      ...makeFrame({
        id: 'i:1',
        name: 'ButtonInstance',
        bounds: { x: 10, y: 10, width: 80, height: 30 },
        relativeX: 10,
        relativeY: 10,
      }),
      type: 'instance',
      componentId: 'comp:button',
    };

    const componentChild: IRFrameNode = {
      ...makeFrame({
        id: 'c:1',
        name: 'CustomControl',
        bounds: { x: 100, y: 10, width: 120, height: 30 },
        relativeX: 100,
        relativeY: 10,
      }),
      type: 'component',
    };

    const parentFrame = makeFrame({
      name: 'Toolbar',
      children: [instanceChild, componentChild],
    });

    const doc = makeDocument({
      pages: [makePage({ children: [parentFrame] })],
    });

    const components = generateFromDocument(doc);

    // Should generate 3 components: ButtonInstance, CustomControl, and Toolbar
    expect(components).toHaveLength(3);
    expect(components.map(c => c.className).sort()).toEqual([
      'ButtonInstance',
      'CustomControl',
      'Toolbar',
    ]);
  });

  it('nested components work with FlexBox layout', () => {
    const child1 = makeFrame({
      id: 'f:c1',
      name: 'Item1',
      bounds: { x: 8, y: 8, width: 100, height: 50 },
      relativeX: 8,
      relativeY: 8,
      layoutGrow: 1,
      children: [],
    });

    const child2 = makeFrame({
      id: 'f:c2',
      name: 'Item2',
      bounds: { x: 120, y: 8, width: 100, height: 50 },
      relativeX: 120,
      relativeY: 8,
      children: [],
    });

    const parentFrame = makeFrame({
      name: 'FlexContainer',
      bounds: { x: 0, y: 0, width: 300, height: 66 },
      children: [child1, child2],
      autoLayout: {
        mode: 'horizontal',
        primaryAxisAlign: 'min',
        counterAxisAlign: 'center',
        paddingTop: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingLeft: 8,
        itemSpacing: 12,
        primaryAxisSizing: 'fixed',
        counterAxisSizing: 'fixed',
        wrap: false,
      },
    });

    const component = generateComponent(parentFrame);

    // resized() should use FlexBox and include nested components
    expect(component.implementation.content).toContain('juce::FlexBox fb');
    expect(component.implementation.content).toContain('juce::FlexItem(item1)');
    expect(component.implementation.content).toContain('juce::FlexItem(item2)');
  });

  it('paint() does not draw nested component children inline', () => {
    const childFrame = makeFrame({
      id: 'f:child',
      name: 'NestedBox',
      bounds: { x: 50, y: 50, width: 100, height: 80 },
      relativeX: 50,
      relativeY: 50,
      fills: [{ type: 'solid', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, opacity: 1, visible: true }],
      children: [makeRect({ id: 'r:nested', relativeX: 10, relativeY: 10 })],
    });

    const parentFrame = makeFrame({
      name: 'Parent',
      fills: [{ type: 'solid', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, opacity: 1, visible: true }],
      children: [childFrame, makeRect({ id: 'r:bg', relativeX: 0, relativeY: 0 })],
    });

    const component = generateComponent(parentFrame);

    // Parent's paint() should:
    // 1. Draw its own background (0.1, 0.1, 0.1)
    // 2. Draw the inline rectangle (r:bg)
    // 3. NOT draw the nested frame's background (0.5, 0.5, 0.5)
    
    const paintBody = component.implementation.content;
    expect(paintBody).toContain('0xff1a1a1a'); // Parent background (0.1 * 255 = 26 = 0x1a)
    expect(paintBody).toContain('0xff333333'); // Inline rect (0.2 * 255 = 51 = 0x33)
    // Should NOT contain nested frame's fill
    expect(paintBody).not.toContain('0xff808080'); // Nested frame (0.5 * 255 = 128 = 0x80)
  });
});
