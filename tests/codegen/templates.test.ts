import { describe, it, expect } from 'vitest';
import { generateHeader, generateImplementation, toGuardName } from '../../src/codegen/templates.js';

describe('toGuardName', () => {
  it('converts PascalCase to UPPER_SNAKE_CASE_H', () => {
    expect(toGuardName('MyComponent')).toBe('MY_COMPONENT_H');
  });

  it('handles single word', () => {
    expect(toGuardName('Panel')).toBe('PANEL_H');
  });

  it('handles consecutive capitals', () => {
    expect(toGuardName('UIPanel')).toBe('UIPANEL_H');
  });
});

describe('generateHeader', () => {
  it('generates a valid header file', () => {
    const result = generateHeader('MyComponent', 'MY_COMPONENT_H');

    expect(result).toContain('#pragma once');
    expect(result).toContain('#include <juce_gui_basics/juce_gui_basics.h>');
    expect(result).toContain('class MyComponent : public juce::Component');
    expect(result).toContain('MyComponent()');
    expect(result).toContain('~MyComponent() override = default');
    expect(result).toContain('void paint(juce::Graphics& g) override');
    expect(result).toContain('void resized() override');
    expect(result).toContain('JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(MyComponent)');
  });

  it('includes child member comments when provided', () => {
    const result = generateHeader('MyComponent', 'MY_COMPONENT_H', [
      { varName: 'knob1', comment: 'Knob 1 (ellipse)' },
      { varName: 'background', comment: 'Background (rectangle)' },
    ]);
    expect(result).toContain('// Knob 1 (ellipse)');
    expect(result).toContain('// juce::Component knob1;');
    expect(result).toContain('// Background (rectangle)');
    expect(result).toContain('// juce::Component background;');
  });

  it('omits child members section when none provided', () => {
    const result = generateHeader('MyComponent', 'MY_COMPONENT_H');
    expect(result).not.toContain('// juce::Component');
  });

  it('uses the provided class name', () => {
    const result = generateHeader('PluginEditor', 'PLUGIN_EDITOR_H');
    expect(result).toContain('class PluginEditor');
    expect(result).toContain('PluginEditor()');
  });
});

describe('generateImplementation', () => {
  it('generates a valid .cpp file', () => {
    const result = generateImplementation(
      'MyComponent',
      'MyComponent.h',
      'g.fillAll(juce::Colours::black);',
      'auto bounds = getLocalBounds();',
    );

    expect(result).toContain('#include "MyComponent.h"');
    expect(result).toContain('MyComponent::MyComponent()');
    expect(result).toContain('void MyComponent::paint(juce::Graphics& g)');
    expect(result).toContain('void MyComponent::resized()');
    expect(result).toContain('g.fillAll(juce::Colours::black)');
    expect(result).toContain('auto bounds = getLocalBounds()');
  });

  it('indents paint and resized bodies', () => {
    const result = generateImplementation(
      'Test',
      'Test.h',
      'line1;\nline2;',
      'lineA;\nlineB;',
    );

    expect(result).toContain('    line1;');
    expect(result).toContain('    line2;');
    expect(result).toContain('    lineA;');
    expect(result).toContain('    lineB;');
  });

  it('handles empty bodies', () => {
    const result = generateImplementation('Empty', 'Empty.h', '', '');

    expect(result).toContain('// (empty)');
  });

  it('generates BinaryData loading when images have fileNames', () => {
    const result = generateImplementation(
      'WithImages',
      'WithImages.h',
      'g.fillAll(juce::Colours::black);',
      'auto bounds = getLocalBounds();',
      [
        { varName: 'image_abc123', comment: 'Image asset (ref: abc123)', fileName: 'image_abc123.png' },
      ],
    );

    expect(result).toContain('image_abc123 = juce::ImageFileFormat::loadFrom(BinaryData::image_abc123_png, BinaryData::image_abc123_pngSize);');
    expect(result).not.toContain('TODO');
  });

  it('generates TODO comments for images without fileNames', () => {
    const result = generateImplementation(
      'MissingImages',
      'MissingImages.h',
      'g.fillAll(juce::Colours::black);',
      'auto bounds = getLocalBounds();',
      [
        { varName: 'image_xyz', comment: 'Image asset (ref: xyz)' },
      ],
    );

    expect(result).toContain('TODO');
    expect(result).toContain('// image_xyz = juce::ImageFileFormat::loadFrom');
  });

  it('generates mixed loading code when some images are downloaded', () => {
    const result = generateImplementation(
      'Mixed',
      'Mixed.h',
      '',
      '',
      [
        { varName: 'image_a', comment: 'a', fileName: 'image_a.png' },
        { varName: 'image_b', comment: 'b' },
      ],
    );

    expect(result).toContain('image_a = juce::ImageFileFormat::loadFrom(BinaryData::image_a_png, BinaryData::image_a_pngSize);');
    expect(result).toContain('// image_b = juce::ImageFileFormat::loadFrom');
  });
});
