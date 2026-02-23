// Detect JUCE component types from Figma node names.
// Convention: prefix or suffix with component type keywords.
//
// Examples:
//   "Knob_Volume"     → juce::Slider (Rotary)
//   "Slider_Gain"     → juce::Slider (Linear)
//   "Button_Bypass"   → juce::ToggleButton
//   "TextButton_Save" → juce::TextButton
//   "Label_Title"     → juce::Label
//   "Combo_Mode"      → juce::ComboBox

export type JuceComponentType =
  | 'juce::Slider'
  | 'juce::ToggleButton'
  | 'juce::TextButton'
  | 'juce::Label'
  | 'juce::ComboBox'
  | 'juce::Component';

export interface ComponentHint {
  type: JuceComponentType;
  style?: string; // e.g. "Rotary", "LinearHorizontal"
  comment: string;
}

interface PatternRule {
  pattern: RegExp;
  type: JuceComponentType;
  style?: string;
  comment: string;
}

// Use (?:^|[\s_\-/]) and (?:$|[\s_\-/]) as word boundaries that respect underscores/hyphens
const B = '(?:^|[\\s_\\-/])';
const E = '(?:$|[\\s_\\-/])';

const RULES: PatternRule[] = [
  // Knobs → Rotary Slider
  { pattern: new RegExp(`${B}knob${E}`, 'i'), type: 'juce::Slider', style: 'Rotary', comment: 'Rotary knob' },
  { pattern: new RegExp(`${B}dial${E}`, 'i'), type: 'juce::Slider', style: 'Rotary', comment: 'Rotary dial' },
  { pattern: new RegExp(`${B}rotary${E}`, 'i'), type: 'juce::Slider', style: 'Rotary', comment: 'Rotary control' },

  // Sliders → Linear Slider
  { pattern: new RegExp(`${B}slider${E}`, 'i'), type: 'juce::Slider', style: 'LinearHorizontal', comment: 'Linear slider' },
  { pattern: new RegExp(`${B}fader${E}`, 'i'), type: 'juce::Slider', style: 'LinearVertical', comment: 'Vertical fader' },

  // Buttons
  { pattern: new RegExp(`${B}toggle${E}`, 'i'), type: 'juce::ToggleButton', comment: 'Toggle button' },
  { pattern: new RegExp(`${B}bypass${E}`, 'i'), type: 'juce::ToggleButton', comment: 'Bypass toggle' },
  { pattern: new RegExp(`${B}switch${E}`, 'i'), type: 'juce::ToggleButton', comment: 'Switch toggle' },
  { pattern: new RegExp(`${B}textbutton${E}`, 'i'), type: 'juce::TextButton', comment: 'Text button' },
  { pattern: new RegExp(`${B}btn${E}`, 'i'), type: 'juce::TextButton', comment: 'Button' },
  { pattern: new RegExp(`${B}button${E}`, 'i'), type: 'juce::TextButton', comment: 'Button' },

  // Labels
  { pattern: new RegExp(`${B}label${E}`, 'i'), type: 'juce::Label', comment: 'Text label' },
  { pattern: new RegExp(`${B}title${E}`, 'i'), type: 'juce::Label', comment: 'Title label' },

  // ComboBox
  { pattern: new RegExp(`${B}combo${E}`, 'i'), type: 'juce::ComboBox', comment: 'Combo box' },
  { pattern: new RegExp(`${B}dropdown${E}`, 'i'), type: 'juce::ComboBox', comment: 'Dropdown selector' },
  { pattern: new RegExp(`${B}select${E}`, 'i'), type: 'juce::ComboBox', comment: 'Selector' },
  { pattern: new RegExp(`${B}menu${E}`, 'i'), type: 'juce::ComboBox', comment: 'Menu selector' },
];

/**
 * Detect a JUCE component type from a Figma node name.
 * Returns null if no known pattern matches.
 */
export function detectComponentHint(nodeName: string): ComponentHint | null {
  for (const rule of RULES) {
    if (rule.pattern.test(nodeName)) {
      return {
        type: rule.type,
        style: rule.style,
        comment: rule.comment,
      };
    }
  }
  return null;
}

/**
 * Generate the member declaration for a detected component.
 */
export function generateMemberDeclaration(varName: string, hint: ComponentHint): string {
  return `${hint.type} ${varName}; // ${hint.comment}`;
}

/**
 * Generate constructor initialization code for a detected component.
 */
export function generateConstructorInit(varName: string, hint: ComponentHint): string[] {
  const lines: string[] = [];

  switch (hint.type) {
    case 'juce::Slider':
      if (hint.style) {
        lines.push(`${varName}.setSliderStyle(juce::Slider::${hint.style});`);
      }
      lines.push(`${varName}.setTextBoxStyle(juce::Slider::NoTextBox, true, 0, 0);`);
      lines.push(`addAndMakeVisible(${varName});`);
      break;

    case 'juce::ToggleButton':
      lines.push(`addAndMakeVisible(${varName});`);
      break;

    case 'juce::TextButton':
      lines.push(`addAndMakeVisible(${varName});`);
      break;

    case 'juce::Label':
      lines.push(`${varName}.setJustificationType(juce::Justification::centred);`);
      lines.push(`addAndMakeVisible(${varName});`);
      break;

    case 'juce::ComboBox':
      lines.push(`addAndMakeVisible(${varName});`);
      break;

    default:
      lines.push(`addAndMakeVisible(${varName});`);
      break;
  }

  return lines;
}
