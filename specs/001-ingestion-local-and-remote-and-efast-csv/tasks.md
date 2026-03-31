# Tasks: Ingestion Local, Remote, and EFAST CSV

**Input**: Design documents from `/specs/001-ingestion-local-and-remote-and-efast-csv/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create zero-dependency Node project scaffolding in /workspaces/pbgc-form5500/package.json
- [x] T002 Create single-file build script in /workspaces/pbgc-form5500/scripts/build.js
- [x] T003 [P] Create static local dev server in /workspaces/pbgc-form5500/scripts/serve.js

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Create inline HTML shell and semantic UI regions in /workspaces/pbgc-form5500/src/index.template.html
- [x] T005 [P] Create shared styles with focus visibility and high contrast support in /workspaces/pbgc-form5500/src/styles.css
- [x] T006 [P] Create pure ingest and CSV utility functions in /workspaces/pbgc-form5500/src/lib/core.js
- [x] T007 Create browser state store and render loop in /workspaces/pbgc-form5500/src/app.js

## Phase 3: User Story 1 - Ingest local filings quickly (Priority: P1) 🎯 MVP

**Goal**: Add local PDF ingestion, drag-and-drop, preview, and removal.

**Independent Test**: Add 10 local PDFs and preview then remove one.

- [x] T008 [US1] Implement local PDF picker handling in /workspaces/pbgc-form5500/src/app.js
- [x] T009 [US1] Implement drag-and-drop routing for local PDFs in /workspaces/pbgc-form5500/src/app.js
- [x] T010 [US1] Implement PDF preview lifecycle with object URL revocation in /workspaces/pbgc-form5500/src/app.js
- [x] T011 [US1] Implement consolidated queue rendering for local items in /workspaces/pbgc-form5500/src/app.js

## Phase 4: User Story 2 - Queue and manage remote PDF downloads (Priority: P1)

**Goal**: Queue remote URLs and manage downloads with progress, cancel, retry, and error messaging.

**Independent Test**: Add 5 remote URLs, download, cancel one, retry a failure.

- [x] T012 [US2] Implement remote URL queue creation in /workspaces/pbgc-form5500/src/app.js
- [x] T013 [US2] Implement concurrency-limited remote download manager in /workspaces/pbgc-form5500/src/app.js
- [x] T014 [US2] Implement response validation and error classification in /workspaces/pbgc-form5500/src/app.js
- [x] T015 [US2] Implement item-level actions for cancel, retry, remove, and open-link in /workspaces/pbgc-form5500/src/app.js
- [x] T016 [US2] Implement explicit `file://` guidance for blocked remote downloads in /workspaces/pbgc-form5500/src/app.js

## Phase 5: User Story 3 - Ingest EFAST CSV search exports (Priority: P2)

**Goal**: Convert CSV filing rows into queue items with traceable metadata and optional PDF downloads.

**Independent Test**: Upload an EFAST CSV export and confirm queue rows plus optional PDF download behavior.

- [x] T017 [P] [US3] Implement CSV parsing and resilient header detection in /workspaces/pbgc-form5500/src/lib/core.js
- [x] T018 [US3] Implement CSV file ingestion path in /workspaces/pbgc-form5500/src/app.js
- [x] T019 [US3] Implement metadata-only CSV row handling and guidance text in /workspaces/pbgc-form5500/src/app.js
- [x] T020 [US3] Reuse the remote download manager for CSV-derived PDF URLs in /workspaces/pbgc-form5500/src/app.js

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T021 [P] Add unit tests for CSV parsing and EFAST CSV header mapping in /workspaces/pbgc-form5500/tests/core.test.js
- [x] T022 Validate single-file build output in /workspaces/pbgc-form5500/scripts/build.js
- [ ] T023 Run manual quickstart verification in /workspaces/pbgc-form5500/specs/001-ingestion-local-and-remote-and-efast-csv/quickstart.md
