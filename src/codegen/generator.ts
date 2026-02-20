// Orchestrator: IR tree → complete JUCE Component .h + .cpp files.

import type { IRDocument, IRPage, IRNode, IRFrameNode } from '../ir/types.js';
import { isIRFrameNode } from '../ir/types.js';
import { generatePaintBody } from './paint.js';
import { generateResizedBody } from './resized.js';
import { generateHeader, generateImplementation, toGuardName } from './templates.js';
import { toClassName } from '../utils/naming.js';

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

  return {
    className,
    header: {
      fileName: headerFileName,
      content: generateHeader(className, guardName),
    },
    implementation: {
      fileName: `${className}.cpp`,
      content: generateImplementation(className, headerFileName, paintBody, resizedBody),
    },
  };
}
