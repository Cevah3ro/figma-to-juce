// .h/.cpp boilerplate templates for generated JUCE Component classes.

/**
 * Generate the .h header file content for a JUCE Component class.
 * @param childMembers Optional array of {varName, comment} for child component placeholders.
 * @param imageMembers Optional array of {varName, comment} for image asset members.
 */
export function generateHeader(
  className: string,
  guardName: string,
  childMembers: { varName: string; comment: string }[] = [],
  imageMembers: { varName: string; comment: string }[] = [],
): string {
  let membersBlock = '';
  
  if (imageMembers.length > 0) {
    membersBlock += '\n    // Image assets (load from BinaryData or file in constructor)\n';
    membersBlock += imageMembers
      .map(m => `    juce::Image ${m.varName}; // ${m.comment}`)
      .join('\n') + '\n';
  }
  
  if (childMembers.length > 0) {
    membersBlock += '\n' + childMembers
      .map(m => `    // ${m.comment}\n    // juce::Component ${m.varName};`)
      .join('\n') + '\n';
  }

  return `#pragma once

#include <juce_gui_basics/juce_gui_basics.h>

class ${className} : public juce::Component
{
public:
    ${className}();
    ~${className}() override = default;

    void paint(juce::Graphics& g) override;
    void resized() override;

private:${membersBlock}
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(${className})
};
`;
}

/**
 * Generate the .cpp implementation file content for a JUCE Component class.
 * @param imageMembers Optional array of image member names to generate loading code comments.
 */
export function generateImplementation(
  className: string,
  headerFileName: string,
  paintBody: string,
  resizedBody: string,
  imageMembers: { varName: string; comment: string }[] = [],
): string {
  const paintLines = indentBlock(paintBody, '    ');
  const resizedLines = indentBlock(resizedBody, '    ');
  
  let constructorBody = '';
  if (imageMembers.length > 0) {
    constructorBody = '\n    // TODO: Load images from resources or files\n';
    constructorBody += '    // Example with BinaryData:\n';
    for (const img of imageMembers) {
      constructorBody += `    // ${img.varName} = juce::ImageFileFormat::loadFrom(BinaryData::${img.varName}_png, BinaryData::${img.varName}_pngSize);\n`;
    }
    constructorBody += '    // Or from file:\n';
    for (const img of imageMembers) {
      constructorBody += `    // ${img.varName} = juce::ImageFileFormat::loadFrom(juce::File("path/to/${img.varName}.png"));\n`;
    }
  }

  return `#include "${headerFileName}"

${className}::${className}()
{${constructorBody}
}

void ${className}::paint(juce::Graphics& g)
{
${paintLines}
}

void ${className}::resized()
{
${resizedLines}
}
`;
}

/**
 * Generate an include-guard-safe name from a class name.
 */
export function toGuardName(className: string): string {
  return className
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase() + '_H';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function indentBlock(code: string, indent: string): string {
  if (!code.trim()) return `${indent}// (empty)`;
  return code
    .split('\n')
    .map(line => (line.trim() ? indent + line : ''))
    .join('\n');
}
