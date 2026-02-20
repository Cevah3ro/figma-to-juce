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
});
