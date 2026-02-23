import { describe, it, expect } from 'vitest';
import { generateFillCode, colourToHex, imageRefToMemberName } from '../../src/codegen/colour.js';
import type { IRImageFill } from '../../src/ir/types.js';

describe('colourToHex', () => {
  it('converts white', () => {
    expect(colourToHex({ r: 1, g: 1, b: 1, a: 1 })).toBe('0xffffffff');
  });

  it('converts black with half alpha', () => {
    expect(colourToHex({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('0x80000000');
  });
});

describe('imageRefToMemberName', () => {
  it('converts a typical Figma imageRef', () => {
    expect(imageRefToMemberName('abc123def')).toBe('image_abc123def');
  });

  it('replaces special chars with underscores', () => {
    expect(imageRefToMemberName('img:1-2.png')).toBe('image_img_1_2_png');
  });
});

describe('generateFillCode for image fills', () => {
  function makeImageFill(overrides: Partial<IRImageFill> = {}): IRImageFill {
    return {
      type: 'image',
      imageRef: 'testImage123',
      scaleMode: 'fill',
      opacity: 1,
      visible: true,
      ...overrides,
    };
  }

  it('generates image fill code for fill mode', () => {
    const code = generateFillCode(makeImageFill({ scaleMode: 'fill' }), 'bounds');
    expect(code).toContain('image_testImage123');
    expect(code).toContain('stretchToFit');
    expect(code).toContain('isValid()');
  });

  it('generates image fill code for fit mode', () => {
    const code = generateFillCode(makeImageFill({ scaleMode: 'fit' }), 'bounds');
    expect(code).toContain('centred');
    expect(code).toContain('onlyReduceInSize');
    expect(code).toContain('image_testImage123');
  });

  it('generates image fill code for tile mode', () => {
    const code = generateFillCode(makeImageFill({ scaleMode: 'tile' }), 'bounds');
    expect(code).toContain('drawImageAt');
    expect(code).toContain('getWidth()');
    expect(code).toContain('getHeight()');
  });

  it('generates image fill code for crop mode', () => {
    const code = generateFillCode(makeImageFill({ scaleMode: 'crop' }), 'bounds');
    expect(code).toContain('fillDestination');
    expect(code).toContain('image_testImage123');
  });

  it('returns empty string for invisible image fills', () => {
    const code = generateFillCode(makeImageFill({ visible: false }), 'bounds');
    expect(code).toBe('');
  });

  it('adds opacity handling when opacity < 1', () => {
    const code = generateFillCode(makeImageFill({ opacity: 0.5, scaleMode: 'fit' }), 'bounds');
    expect(code).toContain('setOpacity');
  });

  it('resets opacity after drawing', () => {
    const code = generateFillCode(makeImageFill({ opacity: 0.5 }), 'bounds');
    expect(code).toContain('setOpacity(1.0f)');
  });
});
