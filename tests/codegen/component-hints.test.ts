import { describe, it, expect } from 'vitest';
import {
  detectComponentHint,
  generateMemberDeclaration,
  generateConstructorInit,
} from '../../src/codegen/component-hints.js';

describe('detectComponentHint', () => {
  it('detects knob as rotary slider', () => {
    const hint = detectComponentHint('Knob_Volume');
    expect(hint).not.toBeNull();
    expect(hint!.type).toBe('juce::Slider');
    expect(hint!.style).toBe('Rotary');
  });

  it('detects dial as rotary slider', () => {
    const hint = detectComponentHint('Gain_Dial');
    expect(hint).not.toBeNull();
    expect(hint!.type).toBe('juce::Slider');
    expect(hint!.style).toBe('Rotary');
  });

  it('detects slider as linear slider', () => {
    const hint = detectComponentHint('Slider_Gain');
    expect(hint).not.toBeNull();
    expect(hint!.type).toBe('juce::Slider');
    expect(hint!.style).toBe('LinearHorizontal');
  });

  it('detects fader as vertical slider', () => {
    const hint = detectComponentHint('Main_Fader');
    expect(hint).not.toBeNull();
    expect(hint!.type).toBe('juce::Slider');
    expect(hint!.style).toBe('LinearVertical');
  });

  it('detects toggle button', () => {
    const hint = detectComponentHint('Toggle_Mute');
    expect(hint).not.toBeNull();
    expect(hint!.type).toBe('juce::ToggleButton');
  });

  it('detects bypass as toggle', () => {
    const hint = detectComponentHint('Bypass');
    expect(hint).not.toBeNull();
    expect(hint!.type).toBe('juce::ToggleButton');
  });

  it('detects button as text button', () => {
    const hint = detectComponentHint('Button_Save');
    expect(hint).not.toBeNull();
    expect(hint!.type).toBe('juce::TextButton');
  });

  it('detects label', () => {
    const hint = detectComponentHint('Label_Title');
    expect(hint).not.toBeNull();
    expect(hint!.type).toBe('juce::Label');
  });

  it('detects combo box', () => {
    const hint = detectComponentHint('Combo_Mode');
    expect(hint).not.toBeNull();
    expect(hint!.type).toBe('juce::ComboBox');
  });

  it('detects dropdown', () => {
    const hint = detectComponentHint('Dropdown_Filter');
    expect(hint).not.toBeNull();
    expect(hint!.type).toBe('juce::ComboBox');
  });

  it('returns null for unknown names', () => {
    expect(detectComponentHint('Background')).toBeNull();
    expect(detectComponentHint('Frame 123')).toBeNull();
    expect(detectComponentHint('Rectangle')).toBeNull();
  });
});

describe('generateMemberDeclaration', () => {
  it('generates slider member', () => {
    const hint = detectComponentHint('Knob_Volume')!;
    const decl = generateMemberDeclaration('knobVolume', hint);
    expect(decl).toBe('juce::Slider knobVolume; // Rotary knob');
  });

  it('generates toggle member', () => {
    const hint = detectComponentHint('Bypass')!;
    const decl = generateMemberDeclaration('bypass', hint);
    expect(decl).toBe('juce::ToggleButton bypass; // Bypass toggle');
  });
});

describe('generateConstructorInit', () => {
  it('generates rotary slider init', () => {
    const hint = detectComponentHint('Knob_Volume')!;
    const lines = generateConstructorInit('knobVolume', hint);
    expect(lines).toContain('knobVolume.setSliderStyle(juce::Slider::Rotary);');
    expect(lines).toContain('knobVolume.setTextBoxStyle(juce::Slider::NoTextBox, true, 0, 0);');
    expect(lines).toContain('addAndMakeVisible(knobVolume);');
  });

  it('generates label init', () => {
    const hint = detectComponentHint('Label_Title')!;
    const lines = generateConstructorInit('labelTitle', hint);
    expect(lines).toContain('labelTitle.setJustificationType(juce::Justification::centred);');
    expect(lines).toContain('addAndMakeVisible(labelTitle);');
  });

  it('generates toggle init', () => {
    const hint = detectComponentHint('Toggle_Mute')!;
    const lines = generateConstructorInit('toggleMute', hint);
    expect(lines).toContain('addAndMakeVisible(toggleMute);');
    expect(lines).toHaveLength(1);
  });
});
