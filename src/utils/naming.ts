// Naming utilities for generating valid C++ identifiers from Figma node names.

/**
 * Convert a Figma node name to a valid C++ class name (PascalCase).
 */
export function toClassName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9\s_-]/g, '').trim();
  if (!cleaned) return 'UnnamedComponent';

  const words = cleaned.split(/[\s_-]+/).filter(Boolean);
  const pascal = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  if (/^[0-9]/.test(pascal)) return 'C' + pascal;
  return pascal;
}

/**
 * Convert a Figma node name to a camelCase variable name.
 */
export function toVariableName(name: string): string {
  const className = toClassName(name);
  return className.charAt(0).toLowerCase() + className.slice(1);
}

/**
 * Sanitize a string to be a valid C++ identifier.
 */
export function sanitizeIdentifier(name: string): string {
  let result = name.replace(/[^a-zA-Z0-9_]/g, '_');
  result = result.replace(/^[0-9]+/, '');
  if (!result) return '_unnamed';
  return result;
}
