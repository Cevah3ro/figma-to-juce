// Math/formatting utilities for C++ code generation.

/**
 * Format a number as a C++ float literal (e.g. "12.0f").
 */
export function toFloat(value: number): string {
  const rounded = roundTo(value, 4);
  const str = Number.isInteger(rounded) ? rounded.toFixed(1) : String(rounded);
  return str + 'f';
}

/**
 * Format a number as a C++ int string.
 */
export function toInt(value: number): string {
  return String(Math.round(value));
}

/**
 * Clamp a value to [min, max].
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a number to a given number of decimal places.
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
