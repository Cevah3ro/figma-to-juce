// Download and save Figma image assets to disk

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface DownloadedImage {
  /** Image reference hash from Figma */
  imageRef: string;
  /** Local file path where the image was saved */
  filePath: string;
  /** File name (e.g., "image_abc123.png") */
  fileName: string;
}

/**
 * Download images from Figma's image export API and save them to disk.
 * 
 * @param imageUrls - Map of imageRef → download URL from Figma
 * @param outputDir - Directory to save images
 * @returns Array of downloaded image metadata
 */
export async function downloadImages(
  imageUrls: Record<string, string>,
  outputDir: string,
): Promise<DownloadedImage[]> {
  const downloaded: DownloadedImage[] = [];
  
  for (const [imageRef, url] of Object.entries(imageUrls)) {
    if (!url) {
      console.warn(`  Warning: No URL for image ref ${imageRef}, skipping`);
      continue;
    }
    
    try {
      const fileName = `image_${sanitizeImageRef(imageRef)}.png`;
      const filePath = join(outputDir, fileName);
      
      console.log(`  Downloading image ${imageRef}...`);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`  Warning: Failed to download ${imageRef} (${response.status}), skipping`);
        continue;
      }
      
      const buffer = await response.arrayBuffer();
      await writeFile(filePath, Buffer.from(buffer));
      
      downloaded.push({
        imageRef,
        filePath,
        fileName,
      });
      
      console.log(`    → ${fileName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  Warning: Failed to download image ${imageRef}: ${message}`);
    }
  }
  
  return downloaded;
}

/**
 * Sanitize an image reference to create a valid file name.
 * Replaces non-alphanumeric characters with underscores.
 */
function sanitizeImageRef(imageRef: string): string {
  return imageRef.replace(/[^a-zA-Z0-9]/g, '_');
}
