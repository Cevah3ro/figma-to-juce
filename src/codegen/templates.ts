// .h/.cpp boilerplate templates for generated JUCE Component classes.

/**
 * Generate the .h header file content for a JUCE Component class.
 * @param childMembers Optional array of {varName, comment} for child component placeholders.
 * @param imageMembers Optional array of {varName, comment, fileName?} for image asset members.
 */
export function generateHeader(
  className: string,
  guardName: string,
  childMembers: { varName: string; comment: string; declaration?: string }[] = [],
  imageMembers: { varName: string; comment: string; fileName?: string }[] = [],
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
      .map(m => {
        if (m.declaration) {
          // Typed JUCE component (detected from name)
          return `    ${m.declaration}`;
        }
        // Generic placeholder (commented out)
        return `    // ${m.comment}\n    // juce::Component ${m.varName};`;
      })
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
 * @param imageMembers Optional array of {varName, comment, fileName?} for image loading code.
 *   When fileName is provided (image was downloaded), generates BinaryData loading code.
 *   Otherwise generates TODO comments with examples.
 */
export function generateImplementation(
  className: string,
  headerFileName: string,
  paintBody: string,
  resizedBody: string,
  imageMembers: { varName: string; comment: string; fileName?: string }[] = [],
  childMembers: { varName: string; constructorLines?: string[] }[] = [],
): string {
  const paintLines = indentBlock(paintBody, '    ');
  const resizedLines = indentBlock(resizedBody, '    ');
  
  let constructorBody = '';
  
  // Component initialization from hints
  const hintedMembers = childMembers.filter(m => m.constructorLines && m.constructorLines.length > 0);
  if (hintedMembers.length > 0) {
    constructorBody += '\n';
    for (const m of hintedMembers) {
      for (const line of m.constructorLines!) {
        constructorBody += `    ${line}\n`;
      }
      constructorBody += '\n';
    }
  }
  
  if (imageMembers.length > 0) {
    const downloadedImages = imageMembers.filter(img => img.fileName);
    const pendingImages = imageMembers.filter(img => !img.fileName);
    
    if (downloadedImages.length > 0) {
      constructorBody += '    // Load images from BinaryData (add downloaded images to your JUCE project\'s BinaryData)\n';
      for (const img of downloadedImages) {
        // Convert filename to BinaryData identifier: image_abc123.png → image_abc123_png
        const binaryName = img.fileName!.replace(/\./g, '_');
        constructorBody += `    ${img.varName} = juce::ImageFileFormat::loadFrom(BinaryData::${binaryName}, BinaryData::${binaryName}Size);\n`;
      }
      constructorBody += '\n';
    }
    
    if (pendingImages.length > 0) {
      constructorBody += '    // TODO: Load images from resources or files\n';
      constructorBody += '    // Example with BinaryData:\n';
      for (const img of pendingImages) {
        constructorBody += `    // ${img.varName} = juce::ImageFileFormat::loadFrom(BinaryData::${img.varName}_png, BinaryData::${img.varName}_pngSize);\n`;
      }
      constructorBody += '    // Or from file:\n';
      for (const img of pendingImages) {
        constructorBody += `    // ${img.varName} = juce::ImageFileFormat::loadFrom(juce::File("path/to/${img.varName}.png"));\n`;
      }
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
