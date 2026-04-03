# Implementation Plan: OCR Scanned Filing Ingestion

**Branch**: `005-ocr-scanned-ingestion` | **Date**: 2026-04-03 | **Spec**: [/workspaces/pbgc-form5500/specs/005-ocr-scanned-ingestion/spec.md](/workspaces/pbgc-form5500/specs/005-ocr-scanned-ingestion/spec.md)
**Input**: Feature specification from `/specs/005-ocr-scanned-ingestion/spec.md`

## Summary

Add a real local OCR fallback for scanned or image-only standard Form 5500 PDFs by rasterizing textless pages with `pdf.js`, running browser-local recognition through embedded `tesseract.js` assets and vendored English language data, then feeding recovered text back into the existing typed extraction pipeline while surfacing OCR confidence and unresolved-field review states in the normal queue workflow.

## Technical Context

**Language/Version**: JavaScript for modern browsers; Node.js 24 for build and tests  
**Primary Dependencies**: `pdfjs-dist` for PDF parsing/rendering; `tesseract.js` plus vendored English traineddata for local OCR  
**Storage**: In-memory browser state plus browser-local IndexedDB cache for the vendored OCR language asset  
**Testing**: `node:test` and `node:assert/strict` via `npm test`  
**Target Platform**: Modern desktop browsers for runtime, Node.js for local build/test  
**Project Type**: Single-file browser application  
**Performance Goals**: Keep the UI responsive during OCR progress updates and preserve usable local processing for representative scanned filings without introducing server work  
**Constraints**: One self-contained HTML artifact in `/dist`; no server; no remote asset fetches at runtime; OCR remains local; preserve typed field containers and deterministic duplicate handling  
**Scale/Scope**: Standard Form 5500 scanned or image-only PDFs only; English OCR model only in this feature; graceful manual-remediation fallback when OCR cannot recover usable text

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Single-file delivery preserved with exactly one distributable HTML file in `/dist`: PASS
- No server component or runtime dependency on external assets introduced: PASS
- Privacy safeguards keep document contents local and avoid content logging: PASS
- Accessibility includes keyboard operation, visible focus, and high contrast: PASS
- Performance plan keeps the UI responsive with at least 50 queued items: PASS
- Data model preserves typed field containers and location references: PASS
- Export rules define stable row order, column order, and duplicate-year resolution: PASS

## Project Structure

### Documentation (this feature)

```text
specs/005-ocr-scanned-ingestion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ocr-ingestion-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
assets/
└── tessdata/
    └── eng.traineddata.gz

src/
├── app.js
├── index.template.html
└── lib/
    ├── core.js
    └── extraction/
        ├── ocr-pipeline.js
        └── pdf-source.js

scripts/
└── build.js

tests/
├── core.test.js
└── extraction.test.js
```

**Structure Decision**: Keep the existing single-project browser app structure. Limit OCR changes to [`scripts/build.js`](/workspaces/pbgc-form5500/scripts/build.js), [`src/lib/extraction/pdf-source.js`](/workspaces/pbgc-form5500/src/lib/extraction/pdf-source.js), [`src/lib/extraction/ocr-pipeline.js`](/workspaces/pbgc-form5500/src/lib/extraction/ocr-pipeline.js), [`src/app.js`](/workspaces/pbgc-form5500/src/app.js), and targeted regressions in [`tests/extraction.test.js`](/workspaces/pbgc-form5500/tests/extraction.test.js).

## Phase 0: Research

See [/workspaces/pbgc-form5500/specs/005-ocr-scanned-ingestion/research.md](/workspaces/pbgc-form5500/specs/005-ocr-scanned-ingestion/research.md).

## Phase 1: Design & Contracts

See:
- [/workspaces/pbgc-form5500/specs/005-ocr-scanned-ingestion/data-model.md](/workspaces/pbgc-form5500/specs/005-ocr-scanned-ingestion/data-model.md)
- [/workspaces/pbgc-form5500/specs/005-ocr-scanned-ingestion/contracts/ocr-ingestion-contract.md](/workspaces/pbgc-form5500/specs/005-ocr-scanned-ingestion/contracts/ocr-ingestion-contract.md)
- [/workspaces/pbgc-form5500/specs/005-ocr-scanned-ingestion/quickstart.md](/workspaces/pbgc-form5500/specs/005-ocr-scanned-ingestion/quickstart.md)

## Post-Design Constitution Check

- Single-file delivery preserved with exactly one distributable HTML file in `/dist`: PASS
- No server component or runtime dependency on external assets introduced: PASS
- Privacy safeguards keep document contents local and avoid content logging: PASS
- Accessibility includes keyboard operation, visible focus, and high contrast: PASS
- Performance plan keeps the UI responsive with at least 50 queued items: PASS
- Data model preserves typed field containers and location references: PASS
- Export rules define stable row order, column order, and duplicate-year resolution: PASS

## Complexity Tracking

No constitution violations expected.
