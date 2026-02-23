// Figma REST API client
// Fetches file data with personal access token. Handles rate limits and retries.

import type { FigmaFileResponse, FigmaNodesResponse } from './types.js';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

export interface FetchOptions {
  /** Maximum number of retries on rate limit (429) responses */
  maxRetries?: number;
  /** Base delay in ms before retrying (doubled each attempt) */
  retryDelay?: number;
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Fetch a complete Figma file by its file key.
 *
 * @param fileKey - The Figma file key (from the URL: figma.com/file/<KEY>/...)
 * @param token - Figma personal access token
 * @param nodeIds - Optional array of node IDs to fetch (uses /files/:key/nodes endpoint)
 * @param options - Retry/rate-limit options
 */
export async function fetchFigmaFile(
  fileKey: string,
  token: string,
  nodeIds?: string[],
  options?: FetchOptions,
): Promise<FigmaFileResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (nodeIds && nodeIds.length > 0) {
    // Use the nodes endpoint for specific nodes, then reshape to FigmaFileResponse
    const nodesResponse = await fetchFigmaNodes(fileKey, token, nodeIds, opts);
    return nodesResponseToFileResponse(nodesResponse);
  }

  const url = `${FIGMA_API_BASE}/files/${fileKey}?geometry=paths`;
  const data = await fetchWithRetry(url, token, opts);
  return data as FigmaFileResponse;
}

/**
 * Fetch specific nodes from a Figma file.
 */
export async function fetchFigmaNodes(
  fileKey: string,
  token: string,
  nodeIds: string[],
  options?: FetchOptions,
): Promise<FigmaNodesResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ids = nodeIds.join(',');
  const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(ids)}&geometry=paths`;
  const data = await fetchWithRetry(url, token, opts);
  return data as FigmaNodesResponse;
}

// ─── Internal ────────────────────────────────────────────────────────────────

/**
 * Reshape a FigmaNodesResponse into a FigmaFileResponse so the parser
 * can consume it uniformly.
 */
function nodesResponseToFileResponse(nodesResponse: FigmaNodesResponse): FigmaFileResponse {
  const allComponents: FigmaFileResponse['components'] = {};
  const allStyles: FigmaFileResponse['styles'] = {};
  const children = [];

  for (const [, nodeData] of Object.entries(nodesResponse.nodes)) {
    if (nodeData) {
      children.push(nodeData.document);
      Object.assign(allComponents, nodeData.components);
      Object.assign(allStyles, nodeData.styles);
    }
  }

  return {
    name: nodesResponse.name,
    role: 'viewer',
    lastModified: nodesResponse.lastModified,
    editorType: 'figma',
    thumbnailUrl: nodesResponse.thumbnailUrl,
    version: nodesResponse.version,
    document: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: [
        {
          id: '0:1',
          name: 'Page 1',
          type: 'CANVAS',
          backgroundColor: { r: 1, g: 1, b: 1, a: 1 },
          children,
        },
      ],
    },
    components: allComponents,
    componentSets: {},
    styles: allStyles,
    schemaVersion: 0,
  };
}

async function fetchWithRetry(
  url: string,
  token: string,
  options: Required<FetchOptions>,
): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': token,
        },
      });

      if (response.status === 429) {
        // Rate limited — wait and retry
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : options.retryDelay * Math.pow(2, attempt);

        if (attempt < options.maxRetries) {
          await sleep(delay);
          continue;
        }
        throw new FigmaApiError(`Rate limited after ${options.maxRetries} retries`, 429);
      }

      if (!response.ok) {
        const body = await response.text();
        throw new FigmaApiError(
          `Figma API error ${response.status}: ${body}`,
          response.status,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof FigmaApiError) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < options.maxRetries) {
        await sleep(options.retryDelay * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error('Failed to fetch from Figma API');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch image fill URLs for the given image refs.
 * Returns a map of imageRef → download URL.
 */
export async function fetchImageFills(
  fileKey: string,
  token: string,
  options?: FetchOptions,
): Promise<Record<string, string>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const url = `${FIGMA_API_BASE}/files/${fileKey}/images`;
  const data = (await fetchWithRetry(url, token, opts)) as {
    meta: { images: Record<string, string> };
  };
  return data.meta.images;
}

export class FigmaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'FigmaApiError';
  }
}
