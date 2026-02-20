# Agent Team Instructions

This project is developed by an AI agent team. Each agent works on specific modules.

## Development Rules
1. READ CLAUDE.md first — it's the project spec
2. READ RESEARCH.md for Figma API and JUCE architecture details
3. Every module needs tests BEFORE implementation (TDD)
4. Use real Figma API response fixtures in tests/ — not hand-crafted JSON
5. Generated C++ code must be syntactically valid (test with regex/AST checks)
6. Commit after each meaningful unit of work
7. Push to main after commits
8. Run `npm test` before every commit

## Current Sprint: MVP Foundation

### Phase 1: Core Types & Parser (DO THIS FIRST)
- [ ] `src/figma/types.ts` — Complete Figma API type definitions
- [ ] `src/ir/types.ts` — Intermediate Representation types  
- [ ] `src/figma/parser.ts` — Parse Figma JSON → IR nodes
- [ ] `tests/fixtures/` — Download real Figma JSON snapshots for testing
- [ ] Tests for parser with real fixtures

### Phase 2: Code Generation
- [ ] `src/codegen/colour.ts` — Colour/gradient generation
- [ ] `src/codegen/paint.ts` — paint() method body generation
- [ ] `src/codegen/resized.ts` — resized() method / setBounds generation  
- [ ] `src/codegen/text.ts` — Text rendering codegen
- [ ] `src/codegen/path.ts` — Vector path codegen
- [ ] `src/codegen/generator.ts` — Main orchestrator: IR → .h/.cpp files
- [ ] Tests for each module with snapshot testing

### Phase 3: CLI & Integration
- [ ] `src/figma/api.ts` — Figma REST API client
- [ ] `src/cli.ts` — CLI with commander.js
- [ ] Integration tests: Figma JSON → full C++ output
- [ ] README.md with usage docs

## Test Fixture Strategy
Use the Figma API to fetch real component data. Store responses in tests/fixtures/:
- `simple-rect.json` — Single colored rectangle
- `rounded-rect-shadow.json` — Rounded rect with drop shadow
- `text-styles.json` — Various text styles
- `gradient-fills.json` — Linear and radial gradients
- `auto-layout.json` — Auto-layout frame
- `knob-component.json` — Typical audio plugin knob
- `full-plugin-ui.json` — Complete plugin UI frame

When completely finished with your task, run:
openclaw system event --text "Done: [brief summary]" --mode now
