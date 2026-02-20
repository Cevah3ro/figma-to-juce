// Figma API client tests
// Tests the API module's error handling and request construction.
// Does NOT make real network requests (we mock fetch).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFigmaFile, fetchFigmaNodes, FigmaApiError } from '../../src/figma/api.js';

// ─── Mock setup ─────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, body = 'Error'): Response {
  return new Response(body, { status });
}

// Minimal valid Figma file response for testing
const MINIMAL_FILE_RESPONSE = {
  name: 'Test File',
  role: 'owner',
  lastModified: '2026-01-01T00:00:00Z',
  editorType: 'figma',
  thumbnailUrl: 'https://example.com/thumb.png',
  version: '1',
  document: {
    id: '0:0',
    name: 'Document',
    type: 'DOCUMENT',
    children: [],
  },
  components: {},
  componentSets: {},
  styles: {},
  schemaVersion: 0,
};

// ─── fetchFigmaFile ─────────────────────────────────────────────────────────

describe('fetchFigmaFile', () => {
  it('sends correct headers and URL', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(MINIMAL_FILE_RESPONSE));

    await fetchFigmaFile('abc123', 'test-token');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.figma.com/v1/files/abc123?geometry=paths');
    expect(options.headers['X-Figma-Token']).toBe('test-token');
  });

  it('returns parsed file response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(MINIMAL_FILE_RESPONSE));

    const result = await fetchFigmaFile('abc123', 'test-token');
    expect(result.name).toBe('Test File');
    expect(result.document.type).toBe('DOCUMENT');
  });

  it('throws FigmaApiError on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(403, 'Forbidden'));

    try {
      await fetchFigmaFile('abc123', 'bad-token');
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(FigmaApiError);
      expect((e as FigmaApiError).status).toBe(403);
    }
  });

  it('retries on 429 rate limit', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(429))
      .mockResolvedValueOnce(jsonResponse(MINIMAL_FILE_RESPONSE));

    const result = await fetchFigmaFile('abc123', 'test-token', undefined, {
      maxRetries: 2,
      retryDelay: 10,
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.name).toBe('Test File');
  });

  it('throws after max retries on 429', async () => {
    mockFetch
      .mockResolvedValue(errorResponse(429));

    await expect(
      fetchFigmaFile('abc123', 'test-token', undefined, {
        maxRetries: 1,
        retryDelay: 10,
      }),
    ).rejects.toThrow('Rate limited');
  });

  it('uses nodes endpoint when nodeIds provided', async () => {
    const nodesResponse = {
      name: 'Test File',
      lastModified: '2026-01-01T00:00:00Z',
      thumbnailUrl: 'https://example.com/thumb.png',
      version: '1',
      nodes: {
        '1:2': {
          document: {
            id: '1:2',
            name: 'Frame',
            type: 'FRAME',
            children: [],
            absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
            fills: [],
            strokes: [],
            effects: [],
          },
          components: {},
          styles: {},
        },
      },
    };

    mockFetch.mockResolvedValueOnce(jsonResponse(nodesResponse));

    const result = await fetchFigmaFile('abc123', 'test-token', ['1:2']);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/nodes?ids=');
    expect(url).toContain('1%3A2');
    // Should reshape into file response
    expect(result.document.type).toBe('DOCUMENT');
  });
});

// ─── fetchFigmaNodes ────────────────────────────────────────────────────────

describe('fetchFigmaNodes', () => {
  it('sends comma-separated node IDs', async () => {
    const nodesResponse = {
      name: 'Test',
      lastModified: '',
      thumbnailUrl: '',
      version: '1',
      nodes: {},
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(nodesResponse));

    await fetchFigmaNodes('file1', 'token', ['1:2', '3:4']);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('ids=1%3A2%2C3%3A4');
  });

  it('retries on network errors', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(jsonResponse({ name: 'Test', nodes: {} }));

    const result = await fetchFigmaNodes('file1', 'token', ['1:2'], {
      maxRetries: 2,
      retryDelay: 10,
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.name).toBe('Test');
  });
});

// ─── FigmaApiError ──────────────────────────────────────────────────────────

describe('FigmaApiError', () => {
  it('has status and name', () => {
    const err = new FigmaApiError('Not found', 404);
    expect(err.status).toBe(404);
    expect(err.name).toBe('FigmaApiError');
    expect(err.message).toBe('Not found');
    expect(err).toBeInstanceOf(Error);
  });
});
