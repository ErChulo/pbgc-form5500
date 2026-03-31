# Implementation Plan: Full 5500 Extraction

**Branch**: `003-full-5500-extraction` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-full-5500-extraction/spec.md`

## Summary

Replace the current stub extractor with a browser-local extraction pipeline that
parses every historical standard Form 5500 year and every attached schedule
type, populates the typed schema registry from filing evidence, and falls back
to OCR plus user-guided text-searchable PDF re-preparation when embedded text is
insufficient.

## Technical Context

**Language/Version**: JavaScript in browser plus Node.js 24 for build/test  
**Primary Dependencies**: `pdf.js` display layer for PDF parsing and rendering; `tesseract.js` for OCR fallback; no backend services  
**Storage**: In-memory filing artifacts, extracted records, schema registry, and user-triggered CSV export  
**Testing**: `node --test` for pure logic plus browser/manual validation with representative historical PDFs  
**Target Platform**: Modern desktop browsers with support for WebAssembly, Blob APIs, workers, and canvas rendering  
**Project Type**: Single-file browser application  
**Performance Goals**: Responsive queue and extraction progress with at least 50 queued items; usable extraction throughput for multi-page filings without freezing the UI  
**Constraints**: One distributable HTML file in `/dist`; all processing local in browser; no programmatic remote fetch; support every historical standard Form 5500 year and all schedule types; no derived analytical values  
**Scale/Scope**: Historical year-aware schema registry, full extraction pipeline, OCR fallback, exception reporting, and all-years export integration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Single-file delivery remains mandatory: any third-party library, worker, language data, or OCR asset must be bundled into one self-contained HTML output.
- Local-only processing remains mandatory: PDF parsing, OCR, field mapping, exception handling, and export all stay inside the browser with no backend or proxy.
- Accessibility remains mandatory: extraction progress, exceptions, and remediation guidance must remain keyboard accessible and visible in high-contrast mode.
- Deterministic typed data remains mandatory: every extracted field must continue to populate the existing typed container with stable schema-driven order and location references.
- Performance remains a gate: OCR and historical-year mapping must use worker-based/background processing and throttled UI updates to keep the app responsive.
- Post-design re-check: planned stack and design artifacts pass the constitution because they keep processing local, preserve one-file distribution, and maintain the typed schema contract.

## Project Structure

### Documentation (this feature)

```text
specs/003-full-5500-extraction/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── extraction-contract.md
│   └── schema-registry-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app.js
├── index.template.html
├── lib/
│   ├── core.js
│   ├── extraction/
│   │   ├── pdf-source.js
│   │   ├── ocr-pipeline.js
│   │   ├── schedule-router.js
│   │   ├── field-mapper.js
│   │   └── quality.js
│   └── schema/
│       ├── historical-registry.js
│       └── code-lists.js
└── styles.css

scripts/
├── build.js
└── serve.js

tests/
├── core.test.js
├── extraction.test.js
└── fixtures/
```

**Structure Decision**: Keep UI orchestration in `src/app.js`, keep pure export
and aggregation logic in `src/lib/core.js`, and add a dedicated extraction
subtree for PDF parsing, OCR fallback, schedule routing, field mapping, and
quality scoring.

## Phase 0: Research Summary

- Decision: Use `pdf.js` as the primary PDF parsing and page-rendering layer.
  - Rationale: it is the official browser-focused PDF parsing stack and exposes the display-layer APIs needed to read document text and render pages for OCR fallback.
- Decision: Use `tesseract.js` only for OCR on rasterized page regions, not for direct PDF parsing.
  - Rationale: its official scope is OCR on images; PDF pages will be rasterized first by the PDF layer before OCR is attempted.
- Decision: Do not adopt `scribe.js` as the primary stack.
  - Rationale: it supports PDF OCR/extraction, but its AGPL license creates a materially different distribution and compliance posture than the current codebase.
- Decision: Represent historical form and schedule variations as year-aware schema slices under one registry authority.
  - Rationale: this preserves deterministic export order while allowing year-specific mappings and wording differences.

## Phase 1: Design Artifacts

- `research.md`: documents the stack decision, OCR fallback approach, and license/compliance tradeoffs.
- `data-model.md`: defines filing source artifacts, OCR jobs, field evidence, extraction exceptions, and historical schema slices.
- `contracts/extraction-contract.md`: defines the extraction result contract, exception states, and remediation flow.
- `contracts/schema-registry-contract.md`: defines year-aware schema and location reference requirements.
- `quickstart.md`: defines manual validation across text-native, OCR-assisted, degraded, and duplicate-year filings.
- Agent context update target: `AGENTS.md` via `.specify/scripts/bash/update-agent-context.sh codex`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Additional extraction modules under `src/lib/extraction/` | Full historical extraction needs clear separation of concerns | Keeping all mapping and OCR logic in one file would make year-aware extraction unmaintainable |
