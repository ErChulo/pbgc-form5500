# Tasks: Full Filing Package Extraction

**Input**: Design documents from `/specs/006-full-filing-extraction/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are required for this feature because representative-corpus validation and typed extraction regressions are explicit release gates in the specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Constitution Coverage**: Tasks below preserve single-file delivery, local-only processing, accessibility, deterministic typed contracts, and deterministic exports.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the full-extraction scaffolding and validation fixtures needed for all later work

- [x] T001 Create the full-extraction fixture manifest and expected-value reference files under `tests/fixtures/feature-006/`
- [x] T002 [P] Add full-filing extraction validation helpers in `tests/extraction.test.js`
- [x] T003 [P] Document representative corpus usage and review workflow in `specs/006-full-filing-extraction/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Expand the canonical extraction contracts and shared routing infrastructure before any user-story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Expand the canonical field registry for full filing-package extraction in `src/lib/schema/historical-registry.js`
- [x] T005 [P] Add additional canonical code lists and schedule metadata in `src/lib/schema/code-lists.js`
- [x] T006 Refactor schedule detection and page classification for full package coverage in `src/lib/extraction/schedule-router.js`
- [x] T007 Refactor record assembly to support expanded canonical fields, evidence, and exceptions in `src/lib/core.js`
- [x] T008 [P] Extend filing-level quality and review-state metrics for full extraction in `src/lib/extraction/quality.js`
- [x] T009 Add foundational regression coverage for expanded field containers and deterministic assembly in `tests/core.test.js`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Extract A Complete Filing Record (Priority: P1) 🎯 MVP

**Goal**: Produce one materially complete typed record from the main form, schedules, and attachments for a text-searchable filing package

**Independent Test**: Ingest a representative multi-schedule filing package and confirm the extracted record contains the expected plan-level, schedule-level, and attachment-derived fields with typed outputs and source evidence

### Tests for User Story 1 ⚠️

- [ ] T010 [P] [US1] Add main-form and schedule extraction regressions in `tests/extraction.test.js`
- [ ] T011 [P] [US1] Add attachment-derived value regressions for audited financial statements and actuarial attachments in `tests/extraction.test.js`

### Implementation for User Story 1

- [ ] T012 [US1] Implement main-form extraction coverage for the expanded canonical field set in `src/lib/extraction/field-mapper.js`
- [ ] T013 [US1] Implement Schedule H and Schedule I field extraction coverage in `src/lib/extraction/field-mapper.js`
- [ ] T014 [US1] Implement Schedule SB and Schedule MB field extraction coverage in `src/lib/extraction/field-mapper.js`
- [ ] T015 [US1] Implement Schedule A, Schedule C, Schedule D, Schedule G, and Schedule R extraction coverage in `src/lib/extraction/field-mapper.js`
- [ ] T016 [US1] Implement attachment-aware extraction for audited financial statements and actuarial attachments in `src/lib/extraction/field-mapper.js`
- [ ] T017 [US1] Integrate expanded typed-field results into filing record construction in `src/lib/core.js`

**Checkpoint**: User Story 1 should produce one materially complete extracted filing record for text-searchable representative filings

---

## Phase 4: User Story 2 - Review Exceptions And Coverage (Priority: P2)

**Goal**: Surface parsed, masked, conflicting, failed, missing, and not-applicable values clearly enough for review

**Independent Test**: Ingest filings with parsed, masked, conflicting, and absent values and confirm the UI and extracted record distinguish each state with source evidence

### Tests for User Story 2 ⚠️

- [ ] T018 [P] [US2] Add conflict, masked-value, and schedule-not-present regressions in `tests/extraction.test.js`
- [ ] T019 [P] [US2] Add review-state metric regressions in `tests/core.test.js`

### Implementation for User Story 2

- [ ] T020 [US2] Implement field-level conflict detection and candidate preservation in `src/lib/extraction/field-mapper.js`
- [ ] T021 [US2] Expand exception records and source evidence for attachment-derived and conflicting values in `src/lib/extraction/field-mapper.js`
- [ ] T022 [US2] Extend record-level review metrics and completion bands in `src/lib/extraction/quality.js`
- [ ] T023 [US2] Update filing review rendering for expanded field states and evidence in `src/app.js`
- [ ] T024 [US2] Update supporting review UI layout and state messaging in `src/index.template.html` and `src/styles.css`

**Checkpoint**: User Story 2 should allow a user to understand exactly why any unresolved field remains unresolved

---

## Phase 5: User Story 3 - Produce Complete Cross-Year Outputs (Priority: P3)

**Goal**: Carry the expanded canonical field set into All years aggregation and export with deterministic rules

**Independent Test**: Ingest a multi-year plan corpus with duplicate-year cases and confirm the All years view and exports contain the expanded field set in stable order with preserved review states

### Tests for User Story 3 ⚠️

- [ ] T025 [P] [US3] Add expanded all-years aggregation regressions in `tests/core.test.js`
- [ ] T026 [P] [US3] Add duplicate-year deterministic selection regressions for expanded fields in `tests/core.test.js`

### Implementation for User Story 3

- [ ] T027 [US3] Extend all-years aggregation for the expanded canonical field set in `src/lib/core.js`
- [ ] T028 [US3] Update all-years export headers, field ordering, and unresolved-state serialization in `src/lib/schema/historical-registry.js` and `src/lib/core.js`
- [ ] T029 [US3] Update the All years UI to render expanded field groups and review-state summaries in `src/app.js`
- [ ] T030 [US3] Update All years layout and readability styling for the expanded field set in `src/styles.css`

**Checkpoint**: User Story 3 should deliver stable, materially complete cross-year outputs for the expanded extraction scope

---

## Phase 6: User Story 4 - Handle Scanned Filings As A Follow-On Phase (Priority: P4)

**Goal**: Preserve compatibility with a later OCR phase without blocking text-searchable completion

**Independent Test**: Confirm that scanned-file placeholders and OCR boundary messaging preserve the same canonical field model and review-state semantics without breaking the text-searchable path

### Tests for User Story 4 ⚠️

- [ ] T031 [P] [US4] Add regression coverage for scanned-filing compatibility and canonical-field preservation in `tests/extraction.test.js`

### Implementation for User Story 4

- [ ] T032 [US4] Align scanned-file placeholder behavior with the expanded canonical field set in `src/lib/extraction/ocr-pipeline.js`
- [ ] T033 [US4] Preserve expanded typed-field contracts for scanned-file fallback handling in `src/lib/core.js`
- [ ] T034 [US4] Update scanned-file review messaging to match the expanded exception model in `src/app.js`

**Checkpoint**: User Story 4 should leave the full-extraction contract compatible with a later OCR implementation without changing the text-searchable delivery

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finalize validation, accessibility, performance, and delivery checks across all user stories

- [ ] T035 [P] Run representative-corpus validation and document coverage results in `specs/006-full-filing-extraction/quickstart.md`
- [ ] T036 Verify keyboard accessibility, visible focus, and high-contrast behavior for expanded review and All years screens in `src/app.js`, `src/index.template.html`, and `src/styles.css`
- [ ] T037 [P] Optimize extraction and rendering hotspots to keep queue interaction responsive with at least 50 filings in `src/app.js`, `src/lib/core.js`, and `src/lib/extraction/quality.js`
- [ ] T038 Rebuild the single-file artifact and verify `/dist` contains exactly `dist/form5500-ingestor-v0.7.0.html`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 field/evidence foundations
- **User Story 3 (Phase 5)**: Depends on User Story 1 and User Story 2
- **User Story 4 (Phase 6)**: Depends on Foundational completion and should be aligned after the text-searchable model is stable
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - establishes the MVP
- **User Story 2 (P2)**: Depends on US1 because review states need the expanded extraction outputs
- **User Story 3 (P3)**: Depends on US1 and US2 because exports rely on expanded fields and review-state semantics
- **User Story 4 (P4)**: Depends on US1 contracts and may be deferred until after text-searchable completion

### Within Each User Story

- Tests MUST be written and fail before implementation
- Canonical field coverage before UI integration
- Source evidence and exceptions before coverage metrics
- Core record assembly before All years/export integration
- Story checkpoint must pass before moving to lower-priority delivery

### Parallel Opportunities

- T002 and T003 can run in parallel
- T005 and T008 can run in parallel after T004
- T010 and T011 can run in parallel
- T018 and T019 can run in parallel
- T025 and T026 can run in parallel
- T031 can run in parallel with late-phase contract cleanup
- T035 and T037 can run in parallel during polish

---

## Parallel Example: User Story 1

```bash
# Launch US1 regression tasks together:
Task: "Add main-form and schedule extraction regressions in tests/extraction.test.js"
Task: "Add attachment-derived value regressions for audited financial statements and actuarial attachments in tests/extraction.test.js"

# Launch schedule-family implementation slices in sequence-friendly batches:
Task: "Implement Schedule H and Schedule I field extraction coverage in src/lib/extraction/field-mapper.js"
Task: "Implement Schedule SB and Schedule MB field extraction coverage in src/lib/extraction/field-mapper.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate one representative multi-schedule filing package end-to-end
5. Demo or review the materially complete single-filing extraction result

### Incremental Delivery

1. Complete Setup + Foundational
2. Deliver User Story 1 for materially complete single-filing extraction
3. Add User Story 2 for trustworthy review states and conflicts
4. Add User Story 3 for complete cross-year outputs
5. Add User Story 4 compatibility work for later OCR execution
6. Finish with corpus validation, accessibility, performance, and release verification

### Parallel Team Strategy

With multiple developers:

1. One developer expands schema/core foundations
2. One developer focuses on schedule-family extraction rules
3. One developer focuses on attachment extraction, review states, and UI integration
4. Merge into cross-year/export work only after the canonical field model is stable

---

## Notes

- [P] tasks = different files or independent validation slices
- [Story] labels map directly to spec user stories
- The feature is too large to treat as one undifferentiated parser rewrite; deliver by story and validate each checkpoint
- Representative-corpus validation is a release gate, not optional polish
