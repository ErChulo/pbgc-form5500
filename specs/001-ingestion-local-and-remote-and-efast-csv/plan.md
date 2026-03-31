# Implementation Plan: Ingestion Local, Remote, and EFAST CSV

**Branch**: `001-ingestion-local-and-remote-and-efast-csv` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ingestion-local-and-remote-and-efast-csv/spec.md`

## Summary

Build a browser-only ingestion workspace with four input modes, one shared queue,
one throttled render path, and one remote-reference workflow reused by pasted
URLs and EFAST CSV derived items.

## Technical Context

**Language/Version**: JavaScript running in modern browsers; Node.js 24 for build and test  
**Primary Dependencies**: No runtime dependencies; built-in browser and Node modules only  
**Storage**: In-memory browser state only; user-triggered CSV download output  
**Testing**: `node --test` unit tests for pure logic  
**Target Platform**: Modern desktop browsers opened from `file://` or served over HTTP(S)  
**Project Type**: Single-file browser application  
**Performance Goals**: Responsive queue interactions with at least 50 items; throttled DOM updates during queue updates  
**Constraints**: One distributable HTML file in `/dist`; no server component; no document-content logging; no programmatic remote fetch  
**Scale/Scope**: Initial milestone supports four ingest modes and one consolidated queue

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Single-file delivery preserved by a custom Node build that inlines CSS and JavaScript into one HTML file in `/dist`.
- No server component or external runtime assets are required; remote URLs are stored only as references and are never fetched by the application.
- Privacy is preserved by keeping uploaded files and CSV contents in memory only and by avoiding content logging.
- Accessibility is handled through keyboard-reachable controls, visible focus states, semantic tabs, and high-contrast mode.
- Performance is protected by requestAnimationFrame-based render throttling and object URL revocation on preview close.
- Typed extraction compatibility is preserved by generating or updating one extracted record per queue item, even when the queue item began as CSV metadata only.
- Post-design re-check: PASS. Research, data model, quickstart, and UI contracts remain aligned with the constitution constraints above.

## Project Structure

### Documentation (this feature)

```text
specs/001-ingestion-local-and-remote-and-efast-csv/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
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

scripts/
├── build.js
└── serve.js

tests/
└── core.test.js

dist/
└── form5500-ingestor-v0.7.0.html
```

**Structure Decision**: Use one small source tree with reusable pure logic in
`src/lib/core.js`, browser UI orchestration in `src/app.js`, and a custom build
script that emits the required self-contained HTML file.

## Phase 0: Research Summary

- Decision: Use a zero-dependency custom build pipeline.
  - Rationale: the project started from an empty scaffold and must emit exactly one HTML file.
- Decision: Reuse one remote-reference workflow for pasted URLs and CSV-derived URLs.
  - Rationale: this keeps queue behavior consistent without violating the no-fetch policy.
- Decision: Parse EFAST CSV with a resilient normalized-header mapper.
  - Rationale: EFAST exports vary in spacing, punctuation, and capitalization.

## Phase 1: Design Artifacts

- `research.md`: captures build, remote-reference workflow, and CSV-mapping decisions.
- `data-model.md`: defines `QueueItem`, `DownloadJob`, and `CsvRowMetadata`.
- `contracts/ui-contract.md`: documents queue state transitions, input contract, and user messaging expectations.
- `quickstart.md`: defines the manual validation flow for local, remote, and CSV ingestion.
- Agent context update target: `AGENTS.md` via `.specify/scripts/bash/update-agent-context.sh codex`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
