// End-to-end integration tests: fixture JSON → parser → generator → valid C++ output
// Verifies the full pipeline produces structurally correct JUCE C++ code.

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseFigmaFile } from '../../src/figma/parser.js';
import { generateFromDocument, type GeneratedComponent } from '../../src/codegen/generator.js';
import type { FigmaFileResponse } from '../../src/figma/types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const FIXTURES_DIR = resolve(import.meta.dirname, '../fixtures');

async function loadFixture(name: string): Promise<FigmaFileResponse> {
  const raw = await readFile(resolve(FIXTURES_DIR, name), 'utf-8');
  return JSON.parse(raw) as FigmaFileResponse;
}

function runPipeline(fixture: FigmaFileResponse): GeneratedComponent[] {
  const ir = parseFigmaFile(fixture);
  return generateFromDocument(ir);
}

/** Check that a C++ header has the expected structure */
function assertValidHeader(header: string, className: string): void {
  expect(header).toContain('#pragma once');
  expect(header).toContain('#include <juce_gui_basics/juce_gui_basics.h>');
  expect(header).toContain(`class ${className} : public juce::Component`);
  expect(header).toContain(`${className}();`);
  expect(header).toContain('void paint(juce::Graphics& g) override;');
  expect(header).toContain('void resized() override;');
  expect(header).toContain(`JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(${className})`);
}

/** Check that a C++ implementation has the expected structure */
function assertValidImplementation(impl: string, className: string, headerFile: string): void {
  expect(impl).toContain(`#include "${headerFile}"`);
  expect(impl).toContain(`${className}::${className}()`);
  expect(impl).toContain(`void ${className}::paint(juce::Graphics& g)`);
  expect(impl).toContain(`void ${className}::resized()`);
}

/** Check that paint body contains drawing calls (not empty) */
function assertPaintHasContent(impl: string): void {
  // Should have at least one drawing operation
  const hasDrawing =
    impl.includes('setColour') ||
    impl.includes('fillRect') ||
    impl.includes('fillRoundedRectangle') ||
    impl.includes('fillEllipse') ||
    impl.includes('drawText') ||
    impl.includes('fillPath') ||
    impl.includes('setGradientFill');
  expect(hasDrawing).toBe(true);
}

/** Check that resized body has layout code */
function assertResizedHasContent(impl: string): void {
  expect(impl).toContain('getLocalBounds');
}

// ─── Tests: simple-rect.json ────────────────────────────────────────────────

describe('End-to-end: simple-rect.json', () => {
  let components: GeneratedComponent[];

  it('parses and generates without errors', async () => {
    const fixture = await loadFixture('simple-rect.json');
    components = runPipeline(fixture);
    expect(components.length).toBeGreaterThan(0);
  });

  it('produces a component named PluginBackground', () => {
    expect(components[0].className).toBe('PluginBackground');
  });

  it('generates valid header file', () => {
    const comp = components[0];
    assertValidHeader(comp.header.content, comp.className);
    expect(comp.header.fileName).toBe('PluginBackground.h');
  });

  it('generates valid implementation file', () => {
    const comp = components[0];
    assertValidImplementation(
      comp.implementation.content,
      comp.className,
      comp.header.fileName,
    );
    expect(comp.implementation.fileName).toBe('PluginBackground.cpp');
  });

  it('paint() contains fill and stroke rendering', () => {
    const impl = components[0].implementation.content;
    assertPaintHasContent(impl);
    // Should render the panel rectangle
    expect(impl).toContain('setColour');
    // Should have rounded rectangle (cornerRadius: 12)
    expect(impl).toContain('fillRoundedRectangle');
  });

  it('paint() contains gradient code for accent line', () => {
    const impl = components[0].implementation.content;
    expect(impl).toContain('ColourGradient');
  });

  it('paint() contains drop shadow code', () => {
    const impl = components[0].implementation.content;
    expect(impl).toContain('DropShadow');
  });

  it('resized() contains layout code', () => {
    const impl = components[0].implementation.content;
    assertResizedHasContent(impl);
    // This fixture uses constraint-based layout (LEFT_RIGHT, TOP_BOTTOM)
    expect(impl).toContain('juce::Rectangle<int>');
  });

  it('hidden element is excluded', () => {
    const impl = components[0].implementation.content;
    // The "Hidden Element" (visible: false) should not appear
    // Count drawing operations — should only be for Panel and Accent Line
    const fillCalls = impl.match(/fillR/g);
    // Should have draws for background fill + 2 visible children
    expect(fillCalls).not.toBeNull();
  });
});

// ─── Tests: text-styles.json ────────────────────────────────────────────────

describe('End-to-end: text-styles.json', () => {
  let components: GeneratedComponent[];

  it('parses and generates without errors', async () => {
    const fixture = await loadFixture('text-styles.json');
    components = runPipeline(fixture);
    expect(components.length).toBeGreaterThan(0);
  });

  it('generates valid C++ files', () => {
    for (const comp of components) {
      assertValidHeader(comp.header.content, comp.className);
      assertValidImplementation(
        comp.implementation.content,
        comp.className,
        comp.header.fileName,
      );
    }
  });

  it('paint() contains text rendering', () => {
    const impl = components[0].implementation.content;
    // Should contain drawText or drawFittedText for text nodes
    const hasText = impl.includes('drawText') || impl.includes('drawFittedText');
    expect(hasText).toBe(true);
  });

  it('paint() contains font setup', () => {
    const impl = components[0].implementation.content;
    expect(impl).toContain('setFont');
    expect(impl).toContain('juce::Font');
  });

  it('paint() contains ellipse rendering', () => {
    const impl = components[0].implementation.content;
    expect(impl).toContain('fillEllipse');
  });
});

// ─── Tests: auto-layout-frame.json ──────────────────────────────────────────

describe('End-to-end: auto-layout-frame.json', () => {
  let components: GeneratedComponent[];

  it('parses and generates without errors', async () => {
    const fixture = await loadFixture('auto-layout-frame.json');
    components = runPipeline(fixture);
    expect(components.length).toBeGreaterThan(0);
  });

  it('generates valid C++ files', () => {
    for (const comp of components) {
      assertValidHeader(comp.header.content, comp.className);
      assertValidImplementation(
        comp.implementation.content,
        comp.className,
        comp.header.fileName,
      );
    }
  });

  it('resized() contains FlexBox layout code', () => {
    // At least one component should use FlexBox for auto-layout
    const anyFlexBox = components.some((comp) =>
      comp.implementation.content.includes('FlexBox'),
    );
    expect(anyFlexBox).toBe(true);
  });

  it('resized() contains FlexItem code', () => {
    const anyFlexItem = components.some((comp) =>
      comp.implementation.content.includes('FlexItem'),
    );
    expect(anyFlexItem).toBe(true);
  });
});

// ─── Cross-cutting: structural validity ─────────────────────────────────────

describe('Cross-cutting: all fixtures produce valid C++', () => {
  const fixtures = ['simple-rect.json', 'text-styles.json', 'auto-layout-frame.json'];

  for (const fixtureName of fixtures) {
    it(`${fixtureName}: no duplicate #pragma once`, async () => {
      const fixture = await loadFixture(fixtureName);
      const components = runPipeline(fixture);
      for (const comp of components) {
        const pragmaCount = (comp.header.content.match(/#pragma once/g) ?? []).length;
        expect(pragmaCount).toBe(1);
      }
    });

    it(`${fixtureName}: header and impl filenames match`, async () => {
      const fixture = await loadFixture(fixtureName);
      const components = runPipeline(fixture);
      for (const comp of components) {
        expect(comp.header.fileName).toBe(`${comp.className}.h`);
        expect(comp.implementation.fileName).toBe(`${comp.className}.cpp`);
        expect(comp.implementation.content).toContain(`#include "${comp.header.fileName}"`);
      }
    });

    it(`${fixtureName}: paint and resized methods present in impl`, async () => {
      const fixture = await loadFixture(fixtureName);
      const components = runPipeline(fixture);
      for (const comp of components) {
        const impl = comp.implementation.content;
        expect(impl).toContain(`void ${comp.className}::paint(juce::Graphics& g)`);
        expect(impl).toContain(`void ${comp.className}::resized()`);
      }
    });

    it(`${fixtureName}: no unclosed braces in implementation`, async () => {
      const fixture = await loadFixture(fixtureName);
      const components = runPipeline(fixture);
      for (const comp of components) {
        const impl = comp.implementation.content;
        const openBraces = (impl.match(/\{/g) ?? []).length;
        const closeBraces = (impl.match(/\}/g) ?? []).length;
        expect(openBraces).toBe(closeBraces);
      }
    });
  }
});
