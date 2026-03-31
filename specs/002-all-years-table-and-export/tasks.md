# Tasks: All Years Table and Export

**Input**: Design documents from `/specs/002-all-years-table-and-export/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Confirm shared core logic location in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T002 Confirm shared UI render location in /workspaces/pbgc-form5500/src/app.js

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T003 Create schema registry entries with location references in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T004 Create FieldValue normalization helpers in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T005 Create extracted-record builders for CSV metadata and filename inference in /workspaces/pbgc-form5500/src/lib/core.js

## Phase 3: User Story 1 - Review one deterministic all-years table (Priority: P1) 🎯 MVP

**Goal**: Aggregate extracted records into one stable plan-year table.

**Independent Test**: Ingest duplicate-year records and verify only the preferred row appears.

- [ ] T006 [US1] Implement duplicate selection and stable row sorting in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T007 [US1] Implement All years table rendering in /workspaces/pbgc-form5500/src/app.js
- [ ] T008 [US1] Implement extraction quality display in /workspaces/pbgc-form5500/src/app.js

## Phase 4: User Story 2 - Export the visible table exactly (Priority: P1)

**Goal**: Download or copy the visible table as deterministic CSV.

**Independent Test**: Toggle optional columns and verify the export output matches the screen.

- [ ] T009 [US2] Implement CSV string generation in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T010 [US2] Implement export filename generation in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T011 [US2] Implement Download CSV and Copy CSV actions in /workspaces/pbgc-form5500/src/app.js
- [ ] T012 [US2] Implement optional column chooser state in /workspaces/pbgc-form5500/src/app.js

## Phase 5: User Story 3 - Preserve typed extraction semantics even when stubbed (Priority: P2)

**Goal**: Ensure typed extracted records exist for every queue item even without real PDF scraping.

**Independent Test**: Inspect extracted rows from CSV metadata and filename-only items and verify parse states.

- [ ] T013 [US3] Implement stub extraction from CSV rows in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T014 [US3] Implement stub extraction from filename heuristics in /workspaces/pbgc-form5500/src/lib/core.js
- [ ] T015 [US3] Wire queue item changes to extracted-record refresh in /workspaces/pbgc-form5500/src/app.js

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T016 [P] Add unit tests for quoting, duplicate selection, normalization, and CSV ingestion in /workspaces/pbgc-form5500/tests/core.test.js
- [ ] T017 Validate export behavior against the visible table using /workspaces/pbgc-form5500/specs/002-all-years-table-and-export/quickstart.md
