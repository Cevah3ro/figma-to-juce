# figma-to-juce

Convert Figma designs to pixel-accurate JUCE C++ UI component code.

## Vision
CLI tool that takes Figma design data (via API or JSON export) and generates production-ready JUCE C++ code with 1:1 visual fidelity. Built for audio plugin developers and AI-assisted vibecoding workflows.

## Architecture

### Pipeline
```
Figma API JSON → Parse → Normalize (IR) → Generate → JUCE C++ (.h/.cpp)
```

### Tech Stack
- **Language:** TypeScript (Node.js)
- **Package:** npm, publishable as `npx figma-to-juce`
- **Input:** Figma REST API (via personal access token) or JSON file
- **Output:** JUCE C++ Component classes (.h/.cpp files)

### Core Mapping (Figma → JUCE)
| Figma | JUCE |
|-------|------|
| RECTANGLE | g.fillRoundedRectangle() |
| ELLIPSE | g.fillEllipse() |
| TEXT | g.drawText() / g.drawFittedText() |
| Solid fills | juce::Colour |
| Gradient fills | juce::ColourGradient |
| Drop shadows | juce::DropShadowEffect |
| Auto-layout | juce::FlexBox |
| Absolute pos | setBounds() in resized() |
| Vector paths | juce::Path |
| Images | juce::Image / juce::ImageComponent |

## Project Structure
```
src/
  cli.ts            # CLI entry point
  figma/
    api.ts          # Figma REST API client
    types.ts        # Figma API type definitions
    parser.ts       # Parse Figma JSON into IR
  ir/
    types.ts        # Intermediate Representation types
    normalize.ts    # Figma nodes → IR nodes
  codegen/
    generator.ts    # IR → JUCE C++ code
    templates.ts    # Code templates/snippets
    paint.ts        # paint() method generation
    resized.ts      # resized() method generation
    colour.ts       # Color/gradient handling
    path.ts         # Vector path generation
    text.ts         # Text rendering code gen
  utils/
    math.ts         # Coordinate transforms
    naming.ts       # C++ identifier naming
tests/
  fixtures/         # Real Figma JSON snapshots
  __snapshots__/    # Generated code snapshots
  figma/            # Parser tests
  codegen/          # Generator tests
  integration/      # End-to-end: Figma JSON → C++ → compiles
```

## Testing Strategy (CRITICAL)
- **Unit tests:** Each codegen module (paint, resized, colour, path, text)
- **Snapshot tests:** Figma JSON fixtures → generated C++ code snapshots
- **Integration tests:** Generated C++ must compile against JUCE headers
- **Visual tests:** Where possible, render generated components and compare
- **Live Figma fixtures:** Use real Figma files as test data, not synthetic JSON
- Use vitest for testing

## Commands
```bash
npm test              # Run all tests
npm run build         # Build TypeScript
npm run lint          # ESLint
npx figma-to-juce --file-key <KEY> --token <TOKEN> --output ./generated/
npx figma-to-juce --json ./figma-export.json --output ./generated/
```

## Code Style
- TypeScript strict mode
- No `any` types (use proper Figma API types)
- Pure functions where possible
- Each codegen module handles one concern
- Generated C++ should be clean, readable, well-commented

## Test Data: AresAudio Figma Designs
Use the AresAudio plugin designs from Figma as real-world test cases. These are actual audio plugin UIs with knobs, sliders, and custom components — exactly the target use case. Access them via the Figma MCP. Search for "AresAudio" or "Ares" in the connected Figma account.

## Key Design Decisions
1. **IR layer is mandatory** — never generate C++ directly from Figma JSON
2. **Pixel accuracy > code elegance** — match the design exactly
3. **One Component per Frame** — top-level Figma frames = JUCE Component classes
4. **Relative coordinates** — use proportional bounds for resizability
5. **No runtime dependency** — generated code is standalone JUCE, no extra libs needed
