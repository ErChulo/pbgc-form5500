# Implementation Plan: All Years Table and Export

**Branch**: `002-all-years-table-and-export` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-all-years-table-and-export/spec.md`

## Summary

Build a deterministic aggregation and export layer over the ingestion state,
using a schema registry, typed field values, and a stub extractor that still
produces stable rows and stable CSV output.

## Clarify Defaults

- Keep typed extraction logic in a pure shared module so tests can exercise it without the DOM.
- Use a schema registry with mandatory identifiers plus one representative optional field for future growth.
- Compute extraction quality as `parsedFieldCount/expectedFieldCount`.
- Prefer visible-column export parity over a separate export-only column model in v0.7.0.

## Technical Context

**Language/Version**: JavaScript in browser plus Node.js 24 for tests/build  
**Primary Dependencies**: No runtime dependencies; built-in browser and Node APIs only  
**Storage**: In-memory extracted object map and user-triggered CSV Blob export  
**Testing**: `node --test` unit tests in a single file  
**Target Platform**: Modern desktop browsers with Blob and Clipboard APIs  
**Project Type**: Single-file browser application  
**Performance Goals**: Deterministic aggregation and CSV generation remain responsive for at least 50 items  
**Constraints**: Stable column order, stable row order, typed-field containers, no backend  
**Scale/Scope**: One All years table, one optional column chooser, stub extraction only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Single-file delivery is preserved because all aggregation and export code lives inside the same inline browser script.
- No server component is introduced; CSV generation uses browser Blob APIs only.
- Privacy is preserved because exports happen only on explicit user action.
- Accessibility is preserved through semantic tabs, buttons, and checkbox-based column chooser controls.
- Performance is supported by pure-function aggregation and export paths over in-memory state.
- Typed data requirements are met by the schema registry and FieldValue contract implemented before future scraping work.

## Project Structure

### Documentation (this feature)

```text
specs/002-all-years-table-and-export/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── data-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app.js
├── index.template.html
├── lib/
│   └── core.js
└── styles.css

tests/
└── core.test.js
```

**Structure Decision**: Keep all typed-field, aggregation, and CSV generation
logic in `src/lib/core.js`, then use `src/app.js` only for view-specific orchestration.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
