# Tasks: Numeric Schedule Validation Completion

**Input**: Design documents from `/specs/004-numeric-schedule-validation/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Automated regression coverage is required for the extraction pipeline because this feature closes correctness gaps in participant and schedule numeric fields.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare reusable corpus-validation and fixture-analysis scaffolding for the feature.

- [x] T001 Create a validation corpus manifest and guidance in `specs/004-numeric-schedule-validation/quickstart.md`
- [ ] T002 Add fixture naming and corpus classification helpers in `tests/extraction.test.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared numeric sufficiency and field-definition infrastructure needed by all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Extend targeted numeric field coverage and location references in `src/lib/schema/historical-registry.js`
- [x] T004 [P] Add filing-level numeric sufficiency summary helpers in `src/lib/extraction/quality.js`
- [x] T005 Wire numeric sufficiency metadata into extracted records in `src/lib/core.js`

**Checkpoint**: Numeric sufficiency infrastructure and targeted numeric field definitions are ready.

---

## Phase 3: User Story 1 - Trust numeric values from real filings (Priority: P1) 🎯 MVP

**Goal**: Reliably extract real participant and schedule numeric values from readable standard Form 5500 filings.

**Independent Test**: Ingest a text-searchable filing with real participant counts and Schedule H, Schedule I, or Schedule SB values and confirm the typed field results and source evidence are correct.

### Tests for User Story 1

- [x] T006 [P] [US1] Add participant-count regression cases in `tests/extraction.test.js`
- [x] T007 [P] [US1] Add Schedule H, Schedule I, and Schedule SB numeric regression cases in `tests/extraction.test.js`

### Implementation for User Story 1

- [x] T008 [US1] Implement row-local participant-count extraction improvements in `src/lib/extraction/field-mapper.js`
- [x] T009 [US1] Implement row-local Schedule H and Schedule I numeric extraction improvements in `src/lib/extraction/field-mapper.js`
- [x] T010 [US1] Tighten Schedule SB percentage extraction against real row patterns in `src/lib/extraction/field-mapper.js`
- [x] T011 [US1] Preserve improved numeric evidence and exception context in `src/lib/core.js`

**Checkpoint**: Targeted participant and schedule numeric fields are correctly extracted from readable populated filings.

---

## Phase 4: User Story 2 - Separate valid numeric data from stand-in content (Priority: P1)

**Goal**: Distinguish real numeric validation from masked or stand-in numeric content without overstating extraction success.

**Independent Test**: Ingest one filing with real numeric values and one filing with masked or stand-in values and confirm the app preserves the difference at field and filing level.

### Tests for User Story 2

- [x] T012 [P] [US2] Add masked-versus-valid numeric sufficiency regressions in `tests/extraction.test.js`
- [x] T013 [P] [US2] Add filing-level sufficiency summary regressions in `tests/core.test.js`

### Implementation for User Story 2

- [x] T014 [US2] Expand stand-in numeric detection rules for participant and schedule fields in `src/lib/extraction/field-mapper.js`
- [x] T015 [US2] Emit explicit masked-versus-failed numeric exceptions in `src/lib/extraction/quality.js`
- [x] T016 [US2] Surface numeric sufficiency and insufficiency states in the extraction UI in `src/app.js`
- [x] T017 [US2] Reflect numeric sufficiency details in all-years and filing review state assembly in `src/lib/core.js`

**Checkpoint**: Users can distinguish valid numeric proof from masked or insufficient numeric filings.

---

## Phase 5: User Story 3 - Prove completion against a representative corpus (Priority: P2)

**Goal**: Make completion measurable and repeatable against a representative real-filing corpus.

**Independent Test**: Run the agreed corpus workflow and confirm the same filings produce the same numeric statuses, sufficiency classes, and summary outcomes.

### Tests for User Story 3

- [x] T018 [P] [US3] Add deterministic corpus-summary regression coverage in `tests/core.test.js`
- [ ] T019 [P] [US3] Add representative-corpus validation workflow coverage in `tests/extraction.test.js`

### Implementation for User Story 3

- [x] T020 [US3] Add corpus-level numeric validation summarization in `src/lib/core.js`
- [x] T021 [US3] Add reviewer-facing corpus validation output to the app workflow in `src/app.js`
- [x] T022 [US3] Finalize corpus execution and sign-off guidance in `specs/004-numeric-schedule-validation/quickstart.md`

**Checkpoint**: A representative corpus can be used to prove or disprove completion deterministically.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and release-safety checks across all stories.

- [x] T023 [P] Reconcile numeric validation contract details with implementation in `specs/004-numeric-schedule-validation/contracts/numeric-validation-contract.md`
- [x] T024 Run end-to-end verification with `npm test` and `npm run build`
- [x] T025 [P] Perform quickstart validation and record any residual corpus gaps in `specs/004-numeric-schedule-validation/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and benefits from User Story 1 extraction improvements
- **User Story 3 (Phase 5)**: Depends on Foundational completion and on the numeric statuses introduced by User Stories 1 and 2
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1**: Can start immediately after Foundational
- **US2**: Can start after Foundational, but should land after or alongside US1 because it classifies the improved numeric extraction results
- **US3**: Depends on US1 and US2 outputs so corpus summaries reflect the final numeric statuses

### Within Each User Story

- Tests should be added before or alongside implementation and should fail before the fixes land
- Field-mapper work precedes core aggregation and UI surfacing for the same story
- Core data-shape changes precede app-level display changes

### Parallel Opportunities

- T004 can run in parallel with T003 once foundational scope is agreed
- T006 and T007 can run in parallel
- T012 and T013 can run in parallel
- T018 and T019 can run in parallel
- T023 and T025 can run in parallel after implementation stabilizes

---

## Parallel Example: User Story 1

```bash
# Write the regression cases together:
Task: "Add participant-count regression cases in tests/extraction.test.js"
Task: "Add Schedule H, Schedule I, and Schedule SB numeric regression cases in tests/extraction.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete User Story 1
3. Run `npm test`
4. Validate one real populated filing before expanding scope

### Incremental Delivery

1. Build shared numeric sufficiency infrastructure
2. Deliver correct numeric extraction for targeted participant and schedule fields
3. Add explicit masked-versus-valid numeric handling
4. Add corpus-level completion reporting and final verification

### Parallel Team Strategy

1. One developer handles schema/core sufficiency plumbing
2. One developer focuses on row-local field-mapper improvements
3. One developer expands tests and corpus validation workflow once the data shape stabilizes

---

## Notes

- [P] tasks indicate different files or non-blocking parallel work
- User-story labels map directly to the feature spec
- This feature must not expand into OCR or other filing families
- The completion claim depends on representative real populated numeric filings, not just structurally correct PDFs
