// Integration tests for automatic image downloading

import { describe, it, expect } from 'vitest';
import { generateFromDocument } from '../../src/codegen/generator.js';
import type { IRDocument } from '../../src/ir/types.js';
import type { DownloadedImage } from '../../src/figma/image-downloader.js';

describe('Image download integration', () => {
  it('should generate file loading code when images are downloaded', () => {
    const doc: IRDocument = {
      name: 'Test Doc',
      pages: [
        {
          id: '0:1',
          name: 'Page 1',
          type: 'canvas',
          children: [
            {
              id: '1:1',
              name: 'ImageFrame',
              type: 'frame',
              visible: true,
              bounds: { x: 0, y: 0, width: 200, height: 100 },
              absoluteBounds: { x: 0, y: 0, width: 200, height: 100 },
              relativeTransform: [[1, 0, 0], [0, 1, 0]],
              children: [],
              fills: [
                {
                  type: 'image',
                  visible: true,
                  opacity: 1.0,
                  imageRef: 'abc123hash',
                  scaleMode: 'fit',
                },
              ],
              strokes: [],
              effects: [],
              constraints: { horizontal: 'MIN', vertical: 'MIN' },
              clipsContent: false,
              cornerRadius: 0,
            },
          ],
        },
      ],
    };

    const downloadedImages: DownloadedImage[] = [
      {
        imageRef: 'abc123hash',
        fileName: 'image_abc123hash.png',
        filePath: '/tmp/image_abc123hash.png',
      },
    ];

    const components = generateFromDocument(doc, downloadedImages);
    expect(components).toHaveLength(1);

    const impl = components[0].implementation.content;
    
    // Should have actual loading code, not TODO
    expect(impl).toContain('Load images from BinaryData');
    expect(impl).toContain('image_abc123hash = juce::ImageFileFormat::loadFrom');
    expect(impl).toContain('image_abc123hash_png');
    
    // Should NOT have TODO comments for this image
    expect(impl).not.toContain('TODO: Load images from resources');
  });

  it('should generate TODOs when images are NOT downloaded', () => {
    const doc: IRDocument = {
      name: 'Test Doc',
      pages: [
        {
          id: '0:1',
          name: 'Page 1',
          type: 'canvas',
          children: [
            {
              id: '1:1',
              name: 'ImageFrame',
              type: 'frame',
              visible: true,
              bounds: { x: 0, y: 0, width: 200, height: 100 },
              absoluteBounds: { x: 0, y: 0, width: 200, height: 100 },
              relativeTransform: [[1, 0, 0], [0, 1, 0]],
              children: [],
              fills: [
                {
                  type: 'image',
                  visible: true,
                  opacity: 1.0,
                  imageRef: 'xyz789hash',
                  scaleMode: 'fit',
                },
              ],
              strokes: [],
              effects: [],
              constraints: { horizontal: 'MIN', vertical: 'MIN' },
              clipsContent: false,
              cornerRadius: 0,
            },
          ],
        },
      ],
    };

    // No downloaded images provided
    const components = generateFromDocument(doc, []);
    expect(components).toHaveLength(1);

    const impl = components[0].implementation.content;
    
    // Should have TODO comments
    expect(impl).toContain('TODO: Load images from resources');
    expect(impl).toContain('Example with BinaryData');
    expect(impl).toContain('image_xyz789hash');
  });

  it('should handle mix of downloaded and pending images', () => {
    const doc: IRDocument = {
      name: 'Test Doc',
      pages: [
        {
          id: '0:1',
          name: 'Page 1',
          type: 'canvas',
          children: [
            {
              id: '1:1',
              name: 'ImageFrame',
              type: 'frame',
              visible: true,
              bounds: { x: 0, y: 0, width: 200, height: 100 },
              absoluteBounds: { x: 0, y: 0, width: 200, height: 100 },
              relativeTransform: [[1, 0, 0], [0, 1, 0]],
              children: [],
              fills: [
                {
                  type: 'image',
                  visible: true,
                  opacity: 1.0,
                  imageRef: 'downloaded123',
                  scaleMode: 'fit',
                },
                {
                  type: 'image',
                  visible: true,
                  opacity: 0.8,
                  imageRef: 'pending456',
                  scaleMode: 'fill',
                },
              ],
              strokes: [],
              effects: [],
              constraints: { horizontal: 'MIN', vertical: 'MIN' },
              clipsContent: false,
              cornerRadius: 0,
            },
          ],
        },
      ],
    };

    const downloadedImages: DownloadedImage[] = [
      {
        imageRef: 'downloaded123',
        fileName: 'image_downloaded123.png',
        filePath: '/tmp/image_downloaded123.png',
      },
    ];

    const components = generateFromDocument(doc, downloadedImages);
    expect(components).toHaveLength(1);

    const impl = components[0].implementation.content;
    
    // Should have both actual loading code AND TODOs
    expect(impl).toContain('Load images from BinaryData');
    expect(impl).toContain('image_downloaded123_png');
    expect(impl).toContain('TODO: Load images from resources');
    expect(impl).toContain('image_pending456');
  });
});
