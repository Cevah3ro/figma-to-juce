#!/usr/bin/env node
// CLI entry point for figma-to-juce

import { Command } from 'commander';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fetchFigmaFile, fetchImageFills } from './figma/api.js';
import { parseFigmaFile } from './figma/parser.js';
import { generateFromDocument } from './codegen/generator.js';
import { downloadImages, type DownloadedImage } from './figma/image-downloader.js';
import type { FigmaFileResponse } from './figma/types.js';

const program = new Command();

program
  .name('figma-to-juce')
  .description('Convert Figma designs to pixel-accurate JUCE C++ UI component code')
  .version('0.1.0')
  .option('--file-key <key>', 'Figma file key (from URL: figma.com/file/<KEY>/...)')
  .option('--token <token>', 'Figma personal access token (or set FIGMA_TOKEN env var)')
  .option('--node-ids <ids>', 'Comma-separated list of node IDs to export')
  .option('--json <path>', 'Path to a local Figma JSON export (instead of API)')
  .option('--output <dir>', 'Output directory for generated C++ files', './generated')
  .action(async (opts) => {
    try {
      await run(opts);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exit(1);
    }
  });

program.parse();

interface CliOptions {
  fileKey?: string;
  token?: string;
  nodeIds?: string;
  json?: string;
  output: string;
}

async function run(opts: CliOptions): Promise<void> {
  // Resolve Figma data source
  let figmaData: FigmaFileResponse;
  let downloadedImages: DownloadedImage[] = [];
  let fileKey: string | undefined;
  let token: string | undefined;

  if (opts.json) {
    // Load from local JSON file
    const jsonPath = resolve(opts.json);
    console.log(`Reading Figma JSON from ${jsonPath}...`);
    const raw = await readFile(jsonPath, 'utf-8');
    figmaData = JSON.parse(raw) as FigmaFileResponse;
  } else if (opts.fileKey) {
    // Fetch from Figma API
    fileKey = opts.fileKey;
    token = opts.token ?? process.env.FIGMA_TOKEN;
    if (!token) {
      throw new Error('Figma token required. Use --token or set FIGMA_TOKEN environment variable.');
    }
    const nodeIds = opts.nodeIds?.split(',').map((id) => id.trim());
    console.log(`Fetching Figma file ${opts.fileKey}...`);
    figmaData = await fetchFigmaFile(opts.fileKey, token, nodeIds);
  } else {
    throw new Error('Provide either --file-key (with --token) or --json <path>.');
  }

  // Parse → IR
  console.log(`Parsing "${figmaData.name}"...`);
  const irDocument = parseFigmaFile(figmaData);
  const frameCount = irDocument.pages.reduce((sum, p) => sum + p.children.length, 0);
  console.log(`Found ${irDocument.pages.length} page(s), ${frameCount} top-level frame(s).`);

  // Download images if using Figma API
  if (fileKey && token) {
    console.log('Fetching image URLs...');
    const imageUrls = await fetchImageFills(fileKey, token);
    const imageCount = Object.keys(imageUrls).length;
    
    if (imageCount > 0) {
      console.log(`Downloading ${imageCount} image(s)...`);
      const outputDir = resolve(opts.output);
      await mkdir(outputDir, { recursive: true });
      downloadedImages = await downloadImages(imageUrls, outputDir);
      console.log(`Downloaded ${downloadedImages.length} image(s).`);
    } else {
      console.log('No images to download.');
    }
  }

  // Generate C++ code with downloaded image paths
  const components = generateFromDocument(irDocument, downloadedImages);
  if (components.length === 0) {
    console.log('No components generated. Check that the Figma file contains top-level frames.');
    return;
  }

  // Write output files
  const outputDir = resolve(opts.output);
  await mkdir(outputDir, { recursive: true });

  for (const comp of components) {
    const headerPath = join(outputDir, comp.header.fileName);
    const implPath = join(outputDir, comp.implementation.fileName);

    await writeFile(headerPath, comp.header.content, 'utf-8');
    await writeFile(implPath, comp.implementation.content, 'utf-8');

    console.log(`  ${comp.className}: ${comp.header.fileName}, ${comp.implementation.fileName}`);
  }

  console.log(`\nGenerated ${components.length} component(s) in ${outputDir}`);
}
