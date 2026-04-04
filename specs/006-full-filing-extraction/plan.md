# Implementation Plan: Full Filing Package Extraction

**Branch**: `[006-full-filing-extraction]` | **Date**: 2026-04-04 | **Spec**: [spec.md](/workspaces/pbgc-form5500/specs/006-full-filing-extraction/spec.md)
**Input**: Feature specification from `/specs/006-full-filing-extraction/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Expand the current limited Form 5500 extraction flow into a full filing-package extraction system that reads the main form, all applicable schedules, and qualifying attachments into one canonical typed record. The implementation will extend the in-browser extraction pipeline with schedule-specific parsers, attachment-aware field sourcing, conflict resolution, expanded schema/export contracts, and corpus-driven validation while preserving the single-file, local-only browser delivery model.

## Technical Context

**Language/Version**: JavaScript for modern browsers; Node.js 24 for build and tests  
**Primary Dependencies**: `pdfjs-dist` for PDF text extraction/rendering; built-in browser APIs and Node built-ins  
**Storage**: In-memory browser state only; exported files only on explicit user action  
**Testing**: `node --test tests/*.test.js` plus representative fixture-based extraction regression tests  
**Target Platform**: Modern desktop browsers opening a single self-contained HTML file locally or over static hosting  
**Project Type**: Single-file browser application  
**Performance Goals**: Keep queue interaction responsive with at least 50 filings; process typical text-searchable filing packages without blocking UI interaction; preserve deterministic exports and review-state generation  
**Constraints**: Exactly one distributable HTML file in `/dist`; no backend; no runtime remote asset fetches; no automatic remote document download; all extraction remains local; typed field containers required for every canonical field  
**Scale/Scope**: Hundreds of canonical fields across main form, Schedule A/C/D/G/H/I/MB/R/SB, audited financial statements, actuarial attachments, and multi-year exports for representative pension and welfare plan corpora

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
specs/006-full-filing-extraction/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── extraction-output-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app.js
├── index.template.html
├── styles.css
└── lib/
    ├── core.js
    ├── extraction/
    │   ├── field-mapper.js
    │   ├── pdf-source.js
    │   ├── quality.js
    │   ├── schedule-router.js
    │   └── ocr-pipeline.js
    └── schema/
        ├── code-lists.js
        └── historical-registry.js

tests/
├── core.test.js
└── extraction.test.js
```

**Structure Decision**: Keep the existing single-project browser application structure. Implement schedule-specific and attachment-specific extraction logic inside `src/lib/extraction/`, expand canonical field definitions in `src/lib/schema/`, extend record assembly/export logic in `src/lib/core.js`, surface richer review states in `src/app.js`, and grow fixture-backed regressions in `tests/`.

## Complexity Tracking

No constitution violations are expected. The feature is large in scope but does not require breaking the single-file, local-only architecture.
