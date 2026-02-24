// Orchestrator: IR tree → complete JUCE Component .h + .cpp files.

import type { IRDocument, IRPage, IRNode, IRFrameNode, IRFill } from '../ir/types.js';
import { isIRFrameNode, hasIRChildren } from '../ir/types.js';
import { generatePaintBody } from './paint.js';
import { generateResizedBody } from './resized.js';
import { generateHeader, generateImplementation, toGuardName } from './templates.js';
import { toClassName, toVariableName } from '../utils/naming.js';
import { imageRefToMemberName } from './colour.js';
import { detectComponentHint, generateMemberDeclaration, generateConstructorInit } from './component-hints.js';

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
 * Nested frames are also generated as separate components.
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
      components.push(...generateComponentHierarchy(node));
    }
  }

  return components;
}

/**
 * Generate a component and all its nested component children recursively.
 */
function generateComponentHierarchy(frame: IRFrameNode): GeneratedComponent[] {
  const components: GeneratedComponent[] = [];
  
  // Generate components for nested frame children first (depth-first)
  for (const child of frame.children) {
    if (child.visible && isIRFrameNode(child)) {
      components.push(...generateComponentHierarchy(child));
    }
  }
  
  // Then generate this component
  components.push(generateComponent(frame));
  
  return components;
}

/**
 * Generate a single JUCE Component from a frame.
 * Nested frame children are treated as child component members.
 */
export function generateComponent(frame: IRFrameNode): GeneratedComponent {
  const className = toClassName(frame.name);
  const guardName = toGuardName(className);
  const headerFileName = `${className}.h`;

  // Identify which children are nested components vs. inline-drawn nodes
  const nestedComponents = frame.children
    .filter(c => c.visible && isIRFrameNode(c))
    .map(c => ({
      node: c,
      varName: toVariableName(c.name),
      className: toClassName(c.name),
    }));

  const paintBody = generatePaintBody(frame, nestedComponents.map(nc => nc.node.id));
  const resizedBody = generateResizedBody(frame, nestedComponents);

  // Collect child member info for header
  const childMembers = frame.children
    .filter(c => c.visible)
    .map(c => {
      const varName = toVariableName(c.name);
      
      // Check if this is a nested component
      const isNestedComponent = nestedComponents.some(nc => nc.node.id === c.id);
      if (isNestedComponent) {
        const childClassName = toClassName(c.name);
        return {
          varName,
          comment: `${c.name} — nested component`,
          declaration: `${childClassName} ${varName}; // ${c.name} — nested component`,
          constructorLines: [`addAndMakeVisible(${varName});`],
        };
      }
      
      // Otherwise, check for JUCE component hints
      const hint = detectComponentHint(c.name);
      if (hint) {
        return {
          varName,
          comment: `${c.name} — ${hint.comment}`,
          declaration: generateMemberDeclaration(varName, hint),
          constructorLines: generateConstructorInit(varName, hint),
        };
      }
      
      return {
        varName,
        comment: `${c.name} (${c.type})`,
        declaration: undefined,
        constructorLines: undefined,
      };
    });

  // Collect unique image fills from the entire node tree (excluding nested components)
  const imageFills = collectImageFills(frame, nestedComponents.map(nc => nc.node.id));
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
      content: generateImplementation(className, headerFileName, paintBody, resizedBody, imageMembers, childMembers),
    },
  };
}

/**
 * Recursively collect all unique image fill references from a node tree,
 * excluding nodes that are nested components.
 */
function collectImageFills(node: IRNode, excludeNodeIds: string[]): string[] {
  const imageRefs = new Set<string>();
  
  // Skip if this node is a nested component
  if (excludeNodeIds.includes(node.id)) {
    return [];
  }
  
  // Collect from current node
  for (const fill of node.fills) {
    if (fill.type === 'image' && fill.visible) {
      imageRefs.add(fill.imageRef);
    }
  }
  
  // Recursively collect from children (but skip nested components)
  if (hasIRChildren(node)) {
    for (const child of node.children) {
      const childRefs = collectImageFills(child, excludeNodeIds);
      childRefs.forEach(ref => imageRefs.add(ref));
    }
  }
  
  return Array.from(imageRefs);
}
