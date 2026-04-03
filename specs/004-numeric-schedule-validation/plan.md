# Implementation Plan: Numeric Schedule Validation Completion

**Branch**: `004-numeric-schedule-validation` | **Date**: 2026-04-01 | **Spec**: [/workspaces/pbgc-form5500/specs/004-numeric-schedule-validation/spec.md](/workspaces/pbgc-form5500/specs/004-numeric-schedule-validation/spec.md)
**Input**: Feature specification from `/specs/004-numeric-schedule-validation/spec.md`

## Summary

Complete the remaining numeric extraction work for standard text-searchable Form 5500 filings by improving participant-count and schedule-number parsing, adding explicit numeric-sufficiency handling for masked or stand-in values, and validating the results against a representative corpus of real populated filings while preserving the existing typed-field contract and all-years behavior.

## Technical Context

**Language/Version**: JavaScript for modern browsers; Node.js 24 for build and tests  
**Primary Dependencies**: No runtime dependencies; built-in browser APIs and Node built-ins only  
**Storage**: In-memory browser state only; exported files on explicit user action  
**Testing**: `node:test` and `node:assert/strict` via `npm test`  
**Target Platform**: Modern desktop browsers for runtime, Node.js for local build/test  
**Project Type**: Single-file browser application  
**Performance Goals**: Preserve responsive local processing for at least 50 queued filings while adding corpus validation and additional numeric matching rules  
**Constraints**: One self-contained HTML artifact in `/dist`; no server; no document-content transmission; deterministic typed extraction output; standard Form 5500 only; text-searchable filings only  
**Scale/Scope**: Expand the existing numeric field subset for participant counts, Schedule H, Schedule I, and Schedule SB validation using a representative local corpus and regression tests

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
specs/004-numeric-schedule-validation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── numeric-validation-contract.md
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
    │   ├── ocr-pipeline.js
    │   ├── pdf-source.js
    │   ├── quality.js
    │   └── schedule-router.js
    └── schema/
        ├── code-lists.js
        └── historical-registry.js

tests/
├── core.test.js
└── extraction.test.js
```

**Structure Decision**: Keep the existing single-project browser app structure. Concentrate feature changes in [`src/lib/extraction/field-mapper.js`](/workspaces/pbgc-form5500/src/lib/extraction/field-mapper.js), [`src/lib/core.js`](/workspaces/pbgc-form5500/src/lib/core.js), [`src/lib/extraction/quality.js`](/workspaces/pbgc-form5500/src/lib/extraction/quality.js), [`src/lib/schema/historical-registry.js`](/workspaces/pbgc-form5500/src/lib/schema/historical-registry.js), and [`tests/extraction.test.js`](/workspaces/pbgc-form5500/tests/extraction.test.js).

## Phase 0: Research

See [/workspaces/pbgc-form5500/specs/004-numeric-schedule-validation/research.md](/workspaces/pbgc-form5500/specs/004-numeric-schedule-validation/research.md).

## Phase 1: Design & Contracts

See:
- [/workspaces/pbgc-form5500/specs/004-numeric-schedule-validation/data-model.md](/workspaces/pbgc-form5500/specs/004-numeric-schedule-validation/data-model.md)
- [/workspaces/pbgc-form5500/specs/004-numeric-schedule-validation/contracts/numeric-validation-contract.md](/workspaces/pbgc-form5500/specs/004-numeric-schedule-validation/contracts/numeric-validation-contract.md)
- [/workspaces/pbgc-form5500/specs/004-numeric-schedule-validation/quickstart.md](/workspaces/pbgc-form5500/specs/004-numeric-schedule-validation/quickstart.md)

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
