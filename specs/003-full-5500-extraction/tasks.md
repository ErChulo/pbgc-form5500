# Tasks: Full 5500 Extraction

**Input**: Design documents from `/specs/003-full-5500-extraction/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This feature explicitly requires automated validation of extraction, normalization, duplicate selection, and export behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the extraction stack and build support required by all user stories

- [ ] T001 Update dependency metadata for `pdf.js` and `tesseract.js` in /workspaces/pbgc-form5500/package.json
- [ ] T002 Extend the single-file bundling pipeline for third-party extraction assets in /workspaces/pbgc-form5500/scripts/build.js
- [ ] T003 [P] Create extraction module directories and baseline files under /workspaces/pbgc-form5500/src/lib/extraction/
- [ ] T004 [P] Create schema module directories and baseline files under /workspaces/pbgc-form5500/src/lib/schema/
- [ ] T005 [P] Add fixture placeholders and extraction test scaffold in /workspaces/pbgc-form5500/tests/extraction.test.js

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared extraction infrastructure that MUST be complete before any user story can be finished

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create year-aware schema registry loading and lookup in /workspaces/pbgc-form5500/src/lib/schema/historical-registry.js
- [ ] T007 [P] Create extraction code-list support in /workspaces/pbgc-form5500/src/lib/schema/code-lists.js
- [ ] T008 [P] Implement PDF source loading, page text extraction, and rasterization hooks in /workspaces/pbgc-form5500/src/lib/extraction/pdf-source.js
- [ ] T009 [P] Implement OCR worker pipeline and confidence reporting in /workspaces/pbgc-form5500/src/lib/extraction/ocr-pipeline.js
- [ ] T010 Implement schedule detection and filing-year routing in /workspaces/pbgc-form5500/src/lib/extraction/schedule-router.js
- [ ] T011 Implement field evidence, exception, and quality helper functions in /workspaces/pbgc-form5500/src/lib/extraction/quality.js
- [ ] T012 Implement schema-driven field mapping primitives in /workspaces/pbgc-form5500/src/lib/extraction/field-mapper.js
- [ ] T013 Refactor shared typed-field helpers for extraction reuse in /workspaces/pbgc-form5500/src/lib/core.js

**Checkpoint**: Extraction infrastructure is ready for user-story implementation

## Phase 3: User Story 1 - Extract a complete filing-year record from a Form 5500 package (Priority: P1) 🎯 MVP

**Goal**: Replace the stub extractor with real main-form and schedule extraction for historical standard Form 5500 filings

**Independent Test**: Ingest a text-native Form 5500 package with at least one schedule and verify the filing-year record contains extracted typed values and location references

### Tests for User Story 1 ⚠️

- [ ] T014 [P] [US1] Add native-text extraction tests for main-form and schedule mappings in /workspaces/pbgc-form5500/tests/extraction.test.js
- [ ] T015 [P] [US1] Add historical-year schema selection tests in /workspaces/pbgc-form5500/tests/extraction.test.js

### Implementation for User Story 1

- [ ] T016 [P] [US1] Implement main-form field extraction into typed containers in /workspaces/pbgc-form5500/src/lib/extraction/field-mapper.js
- [ ] T017 [P] [US1] Implement schedule-type extraction coverage in /workspaces/pbgc-form5500/src/lib/extraction/field-mapper.js
- [ ] T018 [US1] Build filing-year extraction record assembly in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T019 [US1] Replace filename/CSV-only stub extraction with PDF-backed extraction orchestration in /workspaces/pbgc-form5500/src/app.js
- [ ] T020 [US1] Surface extraction progress and field-level status in /workspaces/pbgc-form5500/src/app.js

**Checkpoint**: Text-native filings produce complete structured extraction records

## Phase 4: User Story 2 - Build a complete all-years dataset across filings (Priority: P1)

**Goal**: Feed full extracted records into the all-years table and export path without breaking deterministic ordering

**Independent Test**: Ingest multi-year filings including a duplicate year and verify the all-years table/export includes the expanded attribute set for the preferred filing

### Tests for User Story 2 ⚠️

- [ ] T021 [P] [US2] Add all-years aggregation tests for expanded schema coverage in /workspaces/pbgc-form5500/tests/extraction.test.js
- [ ] T022 [P] [US2] Add export parity tests for expanded visible-column sets in /workspaces/pbgc-form5500/tests/core.test.js

### Implementation for User Story 2

- [ ] T023 [US2] Extend all-years aggregation to use full extracted field sets in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T024 [US2] Expand all-years rendering and column chooser handling for full schema output in /workspaces/pbgc-form5500/src/app.js
- [ ] T025 [US2] Preserve deterministic duplicate-year selection with real extracted records in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T026 [US2] Update CSV export to include the expanded schema-driven field set in /workspaces/pbgc-form5500/src/lib/core.js

**Checkpoint**: Multi-year extraction and export work with the expanded schema

## Phase 5: User Story 3 - Trust incomplete or exception-heavy filings without losing traceability (Priority: P2)

**Goal**: Add OCR fallback, unresolved-field traceability, and remediation guidance for degraded filings

**Independent Test**: Ingest an image-only or degraded filing and verify OCR is attempted, unresolved fields remain traceable, and remediation guidance appears when needed

### Tests for User Story 3 ⚠️

- [ ] T027 [P] [US3] Add OCR fallback and exception-state tests in /workspaces/pbgc-form5500/tests/extraction.test.js
- [ ] T028 [P] [US3] Add remediation-guidance tests for OCR-insufficient filings in /workspaces/pbgc-form5500/tests/extraction.test.js

### Implementation for User Story 3

- [ ] T029 [US3] Integrate OCR fallback into the extraction pipeline in /workspaces/pbgc-form5500/src/lib/extraction/ocr-pipeline.js
- [ ] T030 [US3] Capture field evidence and exception records for unresolved values in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T031 [US3] Render extraction exceptions and text-searchable-PDF remediation guidance in /workspaces/pbgc-form5500/src/app.js
- [ ] T032 [US3] Distinguish not-applicable, failed, missing, and OCR-insufficient states in /workspaces/pbgc-form5500/src/lib/extraction/quality.js

**Checkpoint**: Degraded filings remain reviewable and actionable without fabricated values

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, performance, and verification work that affects multiple stories

- [ ] T033 [P] Add extraction performance safeguards and worker-friendly progress throttling in /workspaces/pbgc-form5500/src/app.js
- [ ] T034 [P] Finalize historical schema coverage and location-reference completeness in /workspaces/pbgc-form5500/src/lib/schema/historical-registry.js
- [ ] T035 Validate single-file output still bundles all extraction dependencies in /workspaces/pbgc-form5500/scripts/build.js
- [ ] T036 Run full automated validation for core and extraction tests from /workspaces/pbgc-form5500/tests/
- [ ] T037 Run manual quickstart validation for text-native, OCR-assisted, and duplicate-year scenarios in /workspaces/pbgc-form5500/specs/003-full-5500-extraction/quickstart.md

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 extraction outputs being available
- **User Story 3 (Phase 5)**: Depends on Foundational completion and integrates with User Story 1 extraction flow
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: MVP and base extraction capability
- **User Story 2 (P1)**: Depends on User Story 1 because full all-years output requires real extraction records
- **User Story 3 (P2)**: Depends on User Story 1 extraction flow but can proceed in parallel with late User Story 2 work once the extraction core exists

### Within Each User Story

- Tests should be added before the corresponding implementation tasks are considered done
- Schema/mapping primitives precede record assembly
- Record assembly precedes UI integration
- Exception and remediation handling follow successful baseline extraction integration

## Parallel Opportunities

- Phase 1 tasks `T003`, `T004`, and `T005` can run in parallel
- Phase 2 tasks `T007`, `T008`, and `T009` can run in parallel after baseline directories exist
- User Story 1 tests `T014` and `T015` can run in parallel
- User Story 1 mapping tasks `T016` and `T017` can run in parallel
- User Story 2 tests `T021` and `T022` can run in parallel
- User Story 3 tests `T027` and `T028` can run in parallel
- Polish tasks `T033` and `T034` can run in parallel

## Parallel Example: User Story 1

```bash
# Launch extraction tests for User Story 1 together:
Task: "Add native-text extraction tests for main-form and schedule mappings in /workspaces/pbgc-form5500/tests/extraction.test.js"
Task: "Add historical-year schema selection tests in /workspaces/pbgc-form5500/tests/extraction.test.js"

# Launch mapping implementation tasks for User Story 1 together:
Task: "Implement main-form field extraction into typed containers in /workspaces/pbgc-form5500/src/lib/extraction/field-mapper.js"
Task: "Implement schedule-type extraction coverage in /workspaces/pbgc-form5500/src/lib/extraction/field-mapper.js"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Confirm text-native filings extract into full filing-year records

### Incremental Delivery

1. Build extraction infrastructure
2. Deliver full text-native extraction
3. Extend the all-years table and export with expanded schema output
4. Add OCR fallback and remediation guidance for degraded filings
5. Finish with full regression, performance, and manual validation

## Notes

- All tasks follow the required checklist format with IDs, story labels where applicable, and explicit file paths
- The MVP scope is User Story 1 because it first replaces the current stub extractor with real filing extraction
- User Story 2 depends on completed extraction records and is therefore the second delivery slice
- User Story 3 adds resilience and trust for degraded filings after baseline extraction is working
