import { describe, it, expect } from 'vitest';
import { parseFigmaFile } from '../../src/figma/parser.js';
import { generateFromDocument } from '../../src/codegen/generator.js';
import type { FigmaFileResponse } from '../../src/figma/types.js';

describe('Image fill integration', () => {
  it('generates complete component with image fill handling', () => {
    const figmaFile: FigmaFileResponse = {
      name: 'ImageTest',
      lastModified: '2024-01-01T00:00:00Z',
      version: '1',
      document: {
        id: '0:0',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: '0:1',
            type: 'CANVAS',
            name: 'Page 1',
            backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
            children: [
              {
                id: '1:2',
                type: 'FRAME',
                name: 'ImagePanel',
                visible: true,
                absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
                fills: [
                  {
                    type: 'IMAGE',
                    visible: true,
                    opacity: 0.8,
                    imageRef: 'test-image-ref-123',
                    scaleMode: 'FILL',
                  },
                ],
                strokes: [],
                effects: [],
                cornerRadius: 0,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const ir = parseFigmaFile(figmaFile);
    const components = generateFromDocument(ir);

    expect(components).toHaveLength(1);
    const comp = components[0];
    expect(comp.className).toBe('ImagePanel');

    // Check header contains image member
    expect(comp.header.content).toContain('juce::Image image_test_image_ref_123');
    expect(comp.header.content).toContain('// Image asset (ref: test-image-ref-123)');

    // Check implementation has loading instructions
    expect(comp.implementation.content).toContain('TODO: Load images from resources or files');
    expect(comp.implementation.content).toContain('BinaryData::');
    expect(comp.implementation.content).toContain('image_test_image_ref_123');

    // Check paint method has image drawing code
    expect(comp.implementation.content).toContain('if (image_test_image_ref_123.isValid())');
    expect(comp.implementation.content).toContain('g.drawImage(image_test_image_ref_123');
    expect(comp.implementation.content).toContain('stretchToFit'); // FILL mode
    expect(comp.implementation.content).toContain('g.setOpacity(0.8'); // opacity handling
    expect(comp.implementation.content).toContain('g.setOpacity(1.0f)'); // opacity reset
  });

  it('handles multiple image fills with different scale modes', () => {
    const figmaFile: FigmaFileResponse = {
      name: 'MultiImageTest',
      lastModified: '2024-01-01T00:00:00Z',
      version: '1',
      document: {
        id: '0:0',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: '0:1',
            type: 'CANVAS',
            name: 'Page 1',
            backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
            children: [
              {
                id: '1:2',
                type: 'FRAME',
                name: 'Gallery',
                visible: true,
                absoluteBoundingBox: { x: 0, y: 0, width: 800, height: 600 },
                fills: [],
                strokes: [],
                effects: [],
                cornerRadius: 0,
                children: [
                  {
                    id: '2:1',
                    type: 'RECTANGLE',
                    name: 'Background',
                    visible: true,
                    absoluteBoundingBox: { x: 0, y: 0, width: 800, height: 600 },
                    fills: [
                      {
                        type: 'IMAGE',
                        visible: true,
                        opacity: 1,
                        imageRef: 'bg-image-abc',
                        scaleMode: 'CROP',
                      },
                    ],
                    strokes: [],
                    effects: [],
                    cornerRadius: 0,
                  },
                  {
                    id: '2:2',
                    type: 'RECTANGLE',
                    name: 'Logo',
                    visible: true,
                    absoluteBoundingBox: { x: 10, y: 10, width: 100, height: 100 },
                    fills: [
                      {
                        type: 'IMAGE',
                        visible: true,
                        opacity: 1,
                        imageRef: 'logo-xyz',
                        scaleMode: 'FIT',
                      },
                    ],
                    strokes: [],
                    effects: [],
                    cornerRadius: 8,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const ir = parseFigmaFile(figmaFile);
    const components = generateFromDocument(ir);

    expect(components).toHaveLength(1);
    const comp = components[0];

    // Should have both images as member variables
    expect(comp.header.content).toContain('juce::Image image_bg_image_abc');
    expect(comp.header.content).toContain('juce::Image image_logo_xyz');

    // Should have both drawing calls with different scale modes
    expect(comp.implementation.content).toContain('fillDestination'); // CROP mode
    expect(comp.implementation.content).toContain('centred'); // FIT mode
  });

  it('handles tile scale mode correctly', () => {
    const figmaFile: FigmaFileResponse = {
      name: 'TileTest',
      lastModified: '2024-01-01T00:00:00Z',
      version: '1',
      document: {
        id: '0:0',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: '0:1',
            type: 'CANVAS',
            name: 'Page 1',
            backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
            children: [
              {
                id: '1:2',
                type: 'FRAME',
                name: 'TiledBackground',
                visible: true,
                absoluteBoundingBox: { x: 0, y: 0, width: 600, height: 400 },
                fills: [
                  {
                    type: 'IMAGE',
                    visible: true,
                    opacity: 1,
                    imageRef: 'tile-pattern',
                    scaleMode: 'TILE',
                  },
                ],
                strokes: [],
                effects: [],
                cornerRadius: 0,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const ir = parseFigmaFile(figmaFile);
    const components = generateFromDocument(ir);
    const comp = components[0];

    // Should have tiling loops in paint method
    expect(comp.implementation.content).toContain('getWidth()');
    expect(comp.implementation.content).toContain('getHeight()');
    expect(comp.implementation.content).toContain('for (int y =');
    expect(comp.implementation.content).toContain('for (int x =');
    expect(comp.implementation.content).toContain('drawImageAt');
  });

  it('excludes invisible image fills', () => {
    const figmaFile: FigmaFileResponse = {
      name: 'InvisibleImageTest',
      lastModified: '2024-01-01T00:00:00Z',
      version: '1',
      document: {
        id: '0:0',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: '0:1',
            type: 'CANVAS',
            name: 'Page 1',
            backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
            children: [
              {
                id: '1:2',
                type: 'FRAME',
                name: 'HiddenImageFrame',
                visible: true,
                absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
                fills: [
                  {
                    type: 'IMAGE',
                    visible: false,
                    opacity: 1,
                    imageRef: 'invisible-image',
                    scaleMode: 'FIT',
                  },
                ],
                strokes: [],
                effects: [],
                cornerRadius: 0,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const ir = parseFigmaFile(figmaFile);
    const components = generateFromDocument(ir);
    const comp = components[0];

    // Should NOT have image member since it's invisible
    expect(comp.header.content).not.toContain('image_invisible_image');
    expect(comp.implementation.content).not.toContain('invisible-image');
  });
});
