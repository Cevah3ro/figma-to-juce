// Orchestrator: IR tree → complete JUCE Component .h + .cpp files.

import type { IRDocument, IRPage, IRNode, IRFrameNode, IRFill } from '../ir/types.js';
import { isIRFrameNode, hasIRChildren } from '../ir/types.js';
import { generatePaintBody } from './paint.js';
import { generateResizedBody } from './resized.js';
import { generateHeader, generateImplementation, toGuardName } from './templates.js';
import { toClassName, toVariableName } from '../utils/naming.js';
import { imageRefToMemberName } from './colour.js';

// ─── Public API ─────────────────────────────────────────────────────────────

export interface GeneratedFile {
  fileName: string;
  content: string;
}

export interface GeneratedComponent {
  className: string;
  header: GeneratedFile;
  implementation: GeneratedFile;
}

/**
 * Generate JUCE Component files from an IR document.
 * Top-level frames (and components) become individual Component classes.
 */
export function generateFromDocument(doc: IRDocument): GeneratedComponent[] {
  const components: GeneratedComponent[] = [];

  for (const page of doc.pages) {
    components.push(...generateFromPage(page));
  }

  return components;
}

/**
 * Generate JUCE Component files from a single IR page.
 */
export function generateFromPage(page: IRPage): GeneratedComponent[] {
  const components: GeneratedComponent[] = [];

  for (const node of page.children) {
    if (isIRFrameNode(node)) {
      components.push(generateComponent(node));
    }
  }

  return components;
}

/**
 * Generate a single JUCE Component from a top-level frame.
 */
export function generateComponent(frame: IRFrameNode): GeneratedComponent {
  const className = toClassName(frame.name);
  const guardName = toGuardName(className);
  const headerFileName = `${className}.h`;

  const paintBody = generatePaintBody(frame);
  const resizedBody = generateResizedBody(frame);

  // Collect child member info for header
  const childMembers = frame.children
    .filter(c => c.visible)
    .map(c => ({
      varName: toVariableName(c.name),
      comment: `${c.name} (${c.type})`,
    }));

  // Collect unique image fills from the entire node tree
  const imageFills = collectImageFills(frame);
  const imageMembers = imageFills.map(imageRef => ({
    varName: imageRefToMemberName(imageRef),
    comment: `Image asset (ref: ${imageRef})`,
  }));

  return {
    className,
    header: {
      fileName: headerFileName,
      content: generateHeader(className, guardName, childMembers, imageMembers),
    },
    implementation: {
      fileName: `${className}.cpp`,
      content: generateImplementation(className, headerFileName, paintBody, resizedBody, imageMembers),
    },
  };
}

/**
 * Recursively collect all unique image fill references from a node tree.
 */
function collectImageFills(node: IRNode): string[] {
  const imageRefs = new Set<string>();
  
  // Collect from current node
  for (const fill of node.fills) {
    if (fill.type === 'image' && fill.visible) {
      imageRefs.add(fill.imageRef);
    }
  }
  
  // Recursively collect from children
  if (hasIRChildren(node)) {
    for (const child of node.children) {
      const childRefs = collectImageFills(child);
      childRefs.forEach(ref => imageRefs.add(ref));
    }
  }
  
  return Array.from(imageRefs);
}
