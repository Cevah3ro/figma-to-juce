# figma-to-juce

Convert Figma designs to pixel-accurate JUCE C++ UI component code.

Built for audio plugin developers. Takes Figma design data (via API or JSON export) and generates production-ready JUCE C++ Components with 1:1 visual fidelity.

## Installation

```bash
npm install -g figma-to-juce
```

Or run directly with npx:

```bash
npx figma-to-juce --file-key <KEY> --token <TOKEN> --output ./generated/
```

## Usage

### From Figma API

Fetch a file directly from the Figma REST API:

```bash
# Using --token flag
figma-to-juce --file-key abc123XYZ --token figd_xxxxx --output ./Source/UI/

# Using FIGMA_TOKEN environment variable
export FIGMA_TOKEN=figd_xxxxx
figma-to-juce --file-key abc123XYZ --output ./Source/UI/
```

Export specific nodes by ID:

```bash
figma-to-juce --file-key abc123XYZ --token figd_xxxxx --node-ids "1:2,3:4" --output ./Source/UI/
```

### From local JSON

If you have a Figma JSON export (from the API or a tool), use it directly:

```bash
figma-to-juce --json ./my-design.json --output ./Source/UI/
```

### Options

| Option | Description |
|--------|-------------|
| `--file-key <key>` | Figma file key (from URL: `figma.com/file/<KEY>/...`) |
| `--token <token>` | Figma personal access token (or set `FIGMA_TOKEN` env var) |
| `--node-ids <ids>` | Comma-separated node IDs to export |
| `--json <path>` | Path to a local Figma JSON file (instead of API) |
| `--output <dir>` | Output directory for generated files (default: `./generated`) |

## What gets generated

Each top-level Frame in your Figma file becomes a JUCE `Component` class:

```
generated/
  PluginEditor.h
  PluginEditor.cpp
  SettingsPanel.h
  SettingsPanel.cpp
```

### Example output

**PluginEditor.h**
```cpp
#pragma once

#include <juce_gui_basics/juce_gui_basics.h>

class PluginEditor : public juce::Component
{
public:
    PluginEditor();
    ~PluginEditor() override = default;

    void paint(juce::Graphics& g) override;
    void resized() override;

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PluginEditor)
};
```

**PluginEditor.cpp**
```cpp
#include "PluginEditor.h"

PluginEditor::PluginEditor()
{
}

void PluginEditor::paint(juce::Graphics& g)
{
    // Background fill
    g.setColour(juce::Colour(0xff1c1c24));
    g.fillRect(getLocalBounds().toFloat());

    // Panel with rounded corners and drop shadow
    auto panelBounds = getLocalBounds().toFloat().reduced(20.0f);
    juce::DropShadow(juce::Colour(0x66000000), 12, {0, 4}).drawForRectangle(g, panelBounds.toNearestInt());
    g.setColour(juce::Colour(0xff262631));
    g.fillRoundedRectangle(panelBounds, 12.0f);

    // ... more drawing code
}

void PluginEditor::resized()
{
    auto bounds = getLocalBounds();
    // Proportional layout for child elements
    auto panelBounds = bounds.getProportion(juce::Rectangle<float>(0.033f, 0.05f, 0.933f, 0.9f));
}
```

## Architecture

```
Figma API JSON → Parse → IR (Intermediate Representation) → Generate → JUCE C++ (.h/.cpp)
```

### Pipeline

1. **Fetch** — Retrieve file data from Figma REST API (or load local JSON)
2. **Parse** — Convert Figma node tree into a normalized IR
3. **Generate** — Transform IR nodes into JUCE C++ code

### Figma → JUCE mapping

| Figma | JUCE |
|-------|------|
| RECTANGLE | `g.fillRoundedRectangle()` / `g.fillRect()` |
| ELLIPSE | `g.fillEllipse()` |
| TEXT | `g.drawText()` / `g.drawFittedText()` |
| Solid fills | `juce::Colour` |
| Gradient fills | `juce::ColourGradient` |
| Drop shadows | `juce::DropShadow` |
| Auto-layout | `juce::FlexBox` |
| Absolute positioning | `setBounds()` via `getProportion()` |
| Vector paths | `juce::Path` |
| Constraints | Proportional layout in `resized()` |

### Project structure

```
src/
  cli.ts              # CLI entry point
  figma/
    api.ts            # Figma REST API client
    types.ts          # Figma API type definitions
    parser.ts         # Parse Figma JSON → IR
  ir/
    types.ts          # Intermediate Representation types
  codegen/
    generator.ts      # IR → JUCE C++ orchestrator
    templates.ts      # C++ boilerplate templates
    paint.ts          # paint() method generation
    resized.ts        # resized() method generation
    colour.ts         # Color/gradient code gen
    text.ts           # Text rendering code gen
    path.ts           # SVG path → JUCE Path
  utils/
    math.ts           # Float formatting utilities
    naming.ts         # C++ identifier naming
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Watch mode
npm run test:watch

# Build
npm run build

# Run CLI in dev mode
npm run dev -- --json ./tests/fixtures/simple-rect.json --output ./tmp/
```

### Testing

Tests use real Figma JSON fixtures and verify the full pipeline:

- **Unit tests** — Each codegen module (paint, resized, colour, path, text)
- **Integration tests** — End-to-end: Figma JSON → IR → C++ with structural validation
- **API tests** — Figma client error handling, retries, rate limiting

## Getting a Figma token

1. Go to your [Figma account settings](https://www.figma.com/settings)
2. Scroll to "Personal access tokens"
3. Generate a new token
4. Use it with `--token` or set `FIGMA_TOKEN` in your environment

## Getting a file key

The file key is in the Figma URL:

```
https://www.figma.com/file/abc123XYZ/My-Design
                           ^^^^^^^^^^
                           This is the file key
```

## License

MIT
