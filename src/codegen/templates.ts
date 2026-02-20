// .h/.cpp boilerplate templates for generated JUCE Component classes.

/**
 * Generate the .h header file content for a JUCE Component class.
 */
export function generateHeader(
  className: string,
  guardName: string,
): string {
  return `#pragma once

#include <juce_gui_basics/juce_gui_basics.h>

class ${className} : public juce::Component
{
public:
    ${className}();
    ~${className}() override = default;

    void paint(juce::Graphics& g) override;
    void resized() override;

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(${className})
};
`;
}

/**
 * Generate the .cpp implementation file content for a JUCE Component class.
 */
export function generateImplementation(
  className: string,
  headerFileName: string,
  paintBody: string,
  resizedBody: string,
): string {
  const paintLines = indentBlock(paintBody, '    ');
  const resizedLines = indentBlock(resizedBody, '    ');

  return `#include "${headerFileName}"

${className}::${className}()
{
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
