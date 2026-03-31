<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles:
  - [PRINCIPLE_1_NAME] -> I. Single-File Browser Delivery
  - [PRINCIPLE_2_NAME] -> II. Local-Only Processing & Privacy
  - [PRINCIPLE_3_NAME] -> III. Accessible, Responsive Interaction
  - [PRINCIPLE_4_NAME] -> IV. Deterministic Typed Data Contracts
  - [PRINCIPLE_5_NAME] -> V. Release Discipline & Feature Isolation
- Added sections:
  - Operational Constraints
  - Delivery Workflow
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ updated /workspaces/pbgc-form5500/.specify/templates/plan-template.md
  - ✅ updated /workspaces/pbgc-form5500/.specify/templates/spec-template.md
  - ✅ updated /workspaces/pbgc-form5500/.specify/templates/tasks-template.md
  - ✅ reviewed /workspaces/pbgc-form5500/.specify/templates/constitution-template.md
- Follow-up TODOs:
  - None
-->
# PBGC Form 5500 Constitution

## Core Principles

### I. Single-File Browser Delivery
Every release MUST produce exactly one self-contained HTML file in `/dist`. The
distributable MUST embed all CSS and JavaScript inline, MUST run in a browser
without a server for local file ingestion, and MUST not require any backend or
runtime asset fetches other than explicit user-initiated downloads from
user-provided URLs when the app is served over HTTP(S). Any build, refactor, or
feature work that introduces multiple runtime files or a server dependency is a
constitution violation.

### II. Local-Only Processing & Privacy
All file parsing, normalization, extraction, preview generation, and export
logic MUST execute locally in the browser. The application MUST NOT transmit
document contents anywhere, MUST NOT log document contents, and MUST persist
only metadata unless the user explicitly exports data. Remote fetches are
limited to user-supplied URLs and downloaded bytes MUST remain in memory only.
When browser origin restrictions prevent remote downloads, the product MUST
explain the restriction and direct the user to manual download plus drag-and-drop.

### III. Accessible, Responsive Interaction
All controls MUST be keyboard operable, focus indicators MUST remain visible,
and a high-contrast mode MUST be available. The interface MUST remain usable
and responsive with at least 50 queued items, progress rendering MUST be
throttled, and object URLs created for preview or export MUST be revoked when no
longer needed. Accessibility and performance are release gates, not polish work.

### IV. Deterministic Typed Data Contracts
Every scraped or derived field MUST use a typed container that preserves raw
text, normalized typed values, and parse status. Schema registry entries MUST
include stable identifiers, export ordering, and official Form 5500 location
references with instructions year. Exports MUST have stable column order, stable
row order, and deterministic duplicate-year selection rules. If extraction is
stubbed, the stub MUST still emit valid typed containers and predictable output.

### V. Release Discipline & Feature Isolation
Versioning MUST follow semantic versioning with baseline `v0.7.0`, and the
application footer plus exported filenames MUST embed the version string. Git
workflow MUST use one feature per branch named `001-...`, `002-...`, and so on,
with squash merges and release tags `v0.7.x`. Specifications, plans, and task
lists MUST isolate user-visible features into independently testable increments,
and every change MUST preserve the single-file release artifact.

## Operational Constraints

- The project scope for the current milestone is limited to:
  - ingestion UI covering local PDF, drag-and-drop PDF, pasted URLs, and EFAST
    CSV import
  - an "All years" aggregation table with deterministic CSV export
- Plain DOM manipulation is the default implementation model; no framework or
  server runtime may be introduced unless the constitution is amended.
- Queue state, extracted filing objects, schema registry entries, and UI
  settings MUST live in a single in-memory state store.
- Field definitions MUST include location references consistent with official
  Form 5500 or schedule line-item documentation such as `Form 5500 Part II Line 8a`
  or `Schedule SB Line 14`.
- Testing MUST cover CSV quoting/escaping, deterministic sorting and preferred
  filing selection, FieldValue normalization, and EFAST CSV ingestion robustness.

## Delivery Workflow

- Each feature specification MUST include a clarify section that resolves
  ambiguities by selecting sensible defaults unless a decision is genuinely
  blocking.
- Each implementation plan MUST perform a constitution check against single-file
  delivery, privacy, accessibility, responsiveness, deterministic export, and
  typed-field requirements.
- Each task list MUST include work for verification of accessibility, export
  determinism, privacy-preserving behavior, and required automated tests when
  those concerns apply to the feature.
- Release verification MUST confirm that `/dist` contains exactly one
  distributable HTML file for the target version.

## Governance

This constitution overrides conflicting local conventions for this repository.
Amendments require updating this file, documenting the rationale, updating any
affected Spec Kit templates, and recording the version change in the Sync Impact
Report. Compliance review is mandatory during planning, implementation, and
release validation. Versioning follows semantic rules: MAJOR for incompatible
governance changes, MINOR for new principles or materially expanded obligations,
and PATCH for clarifications that do not change project duties.

**Version**: 1.0.0 | **Ratified**: 2026-03-31 | **Last Amended**: 2026-03-31
