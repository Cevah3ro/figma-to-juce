# Work Log - figma-to-juce

## 2026-02-26 - Automatic Image Download (Issue #1)

**Task:** Implement automatic image downloading from Figma API  
**Status:** ✅ Complete  
**Commits:** `384aeeb`, `1b9749f`

### Problem

Previously, image fills in Figma designs would generate TODO comments in the C++ code. Users had to manually:
1. Download images from Figma
2. Add them to their JUCE project
3. Set up BinaryData resources
4. Write the loading code

This was tedious and broke the automated workflow promised by the tool.

### Solution Implemented

Added automatic image download and BinaryData integration when using the Figma API:

#### 1. Image Downloader (`src/figma/image-downloader.ts`)
- New module to download images from Figma's image export API
- Saves images to disk alongside generated C++ files
- Sanitizes image references for valid filenames
- Returns metadata about downloaded images (ref, filename, filepath)

#### 2. CLI Integration (`src/cli.ts`)
- Automatically fetches image URLs via `fetchImageFills()` when using `--file-key`
- Downloads all referenced images to the output directory
- Passes downloaded image info to the code generator
- Progress logging for image downloads

#### 3. Generator Updates (`src/codegen/generator.ts`)
- Accept `DownloadedImage[]` parameter in `generateFromDocument()` and related functions
- Match downloaded images with IR image fills by reference hash
- Pass image metadata (including filenames) to templates

#### 4. Template Generation (`src/codegen/templates.ts`)
- Generate actual `BinaryData::loadFrom()` code for downloaded images
- Convert filenames to BinaryData identifiers (`image_abc123.png` → `image_abc123_png`)
- Fall back to TODO comments for images that weren't downloaded (e.g., local JSON mode)
- Handle mixed scenarios (some images downloaded, some pending)

#### 5. Testing (`tests/integration/image-download.test.ts`)
- Test BinaryData code generation for downloaded images
- Test TODO fallback for non-downloaded images
- Test mixed scenarios
- All 238 tests passing

#### 6. Documentation (`README.md`)
- Added note about automatic image download when using Figma API
- Clarified the automated workflow: Figma design → complete JUCE project with assets

### Example Output

For a Figma design with an image fill (ref: `abc123hash`), the generator now produces:

**Generated .cpp:**
```cpp
ImageFrame::ImageFrame()
{
    // Load images from BinaryData (add downloaded images to your JUCE project's BinaryData)
    image_abc123hash = juce::ImageFileFormat::loadFrom(BinaryData::image_abc123hash_png, BinaryData::image_abc123hash_pngSize);
}
```

**Generated files:**
```
generated/
  ImageFrame.h
  ImageFrame.cpp
  image_abc123hash.png  ← Automatically downloaded!
```

### Impact

This feature makes the Figma-to-JUCE workflow **fully automated**:
1. Run: `figma-to-juce --file-key ABC --token XYZ`
2. Add generated files to your JUCE project
3. Add downloaded images to BinaryData
4. Build and run

No manual image management required! 🎉

### Future Enhancements

Potential next steps (not in scope for this issue):
- Automatic BinaryData CMakeLists.txt generation
- Image format optimization (PNG vs JPEG)
- Image compression options
- Support for @2x/@3x variants

---

## 2026-02-23 - Image Fill Implementation

**Task:** Implement image fill support for figma-to-juce

### Problem

The codebase had a TODO for image fill handling. When Figma designs contained image fills, the code generator would output a TODO comment instead of generating actual JUCE C++ code to render the images.

### Solution Implemented

### 1. Code Generation (colour.ts)

Implemented `generateImageFillCode()` function that generates JUCE C++ code for drawing images with different scale modes:

- **fill**: Stretch to fill bounds (`juce::RectanglePlacement::stretchToFit`)
- **fit**: Fit within bounds, maintain aspect ratio (`centred | onlyReduceInSize`)
- **crop**: Fill bounds and crop (`fillDestination`)
- **tile**: Tile the image using nested loops and `drawImageAt()`

Features:
- Validates image before drawing with `isValid()` check
- Handles opacity correctly with `setOpacity()` and proper reset
- References member variables named `image_<imageRef>`

### 2. Component Generation (generator.ts)

Added `collectImageFills()` function that:
- Recursively scans the entire IR node tree
- Collects unique image references
- Filters out invisible images
- Returns deduplicated list of image refs

Updated `generateComponent()` to:
- Collect image fills from the node tree
- Pass image member info to template generators

### 3. Template Generation (templates.ts)

Enhanced header generation:
- Adds `juce::Image` member variables for each unique image
- Includes helpful comments with image refs

Enhanced implementation generation:
- Adds TODO comments in constructor explaining how to load images
- Provides examples for both BinaryData (embedded) and file loading
- Suggests proper naming convention for BinaryData resources

### 4. Testing

Added comprehensive integration tests (`tests/integration/image-fill.test.ts`):
- Single image fill with opacity
- Multiple images with different scale modes
- Tile mode with nested loops
- Invisible image handling (should not generate members)

Updated unit tests in `tests/codegen/colour.test.ts`:
- Verified imageRefToMemberName sanitization
- Tested all four scale modes
- Confirmed opacity handling
- Checked invisible fill filtering

### Test Results

All 200 tests passing:
- 45 parser tests
- 11 colour tests
- 14 paint tests
- 21 resized tests
- 13 generator tests
- 10 template tests
- 21 text tests
- 22 path tests
- 30 end-to-end tests
- 9 API tests
- 4 new image fill integration tests

### Example Output

For a Figma frame with an image fill (ref: `abc123hash`, scale mode: `FIT`), the generator now produces:

**Header (.h):**
```cpp
private:
    // Image assets (load from BinaryData or file in constructor)
    juce::Image image_abc123hash; // Image asset (ref: abc123hash)
```

**Implementation (.cpp):**
```cpp
ImageFrame::ImageFrame()
{
    // TODO: Load images from resources or files
    // Example with BinaryData:
    // image_abc123hash = juce::ImageFileFormat::loadFrom(BinaryData::image_abc123hash_png, BinaryData::image_abc123hash_pngSize);
    // Or from file:
    // image_abc123hash = juce::ImageFileFormat::loadFrom(juce::File("path/to/image_abc123hash.png"));
}

void ImageFrame::paint(juce::Graphics& g)
{
    if (image_abc123hash.isValid())
    {
        g.drawImage(image_abc123hash, getLocalBounds().toFloat(),
                    juce::RectanglePlacement::centred | juce::RectanglePlacement::onlyReduceInSize);
    }
}
```

### Files Modified

- `src/codegen/colour.ts` - Added generateImageFillCode() and imageRefToMemberName()
- `src/codegen/generator.ts` - Added collectImageFills() and image member handling
- `src/codegen/templates.ts` - Enhanced header/implementation generation for images
- `tests/codegen/colour.test.ts` - Updated test expectations
- `tests/integration/image-fill.test.ts` - New comprehensive integration tests

### Notes

- Images must be manually loaded in the constructor (BinaryData or file path)
- Image refs are sanitized to valid C++ identifiers
- Non-alphanumeric characters in refs are replaced with underscores
- Invisible fills are excluded from code generation
- Opacity is properly handled and reset after drawing
