# Feature Specification: All Years Table and Export

**Feature Branch**: `002-all-years-table-and-export`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "Build the All years aggregation table with typed field containers, schema registry entries, deterministic duplicate handling, and CSV export."

## Clarifications Applied

- The first version uses a stub extractor that prefers CSV metadata and file-name hints, while leaving unsupported fields explicitly missing.
- Mandatory columns are always visible; the column chooser only controls optional schema-registry columns.
- Duplicate-year aggregation uses `(planYearBeginDate, planYearEndDate)` when available and falls back to the ingest identifier only when both dates are missing.
- Percent normalization stores fractions in `valueNumber`, and the parser records that convention in `parseNotes`.
- Unknown filename years are left missing rather than guessed from unrelated text.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review one deterministic all-years table (Priority: P1)

An analyst opens the All years tab and sees one deterministic row per plan year across all ingested filings with stable ordering and visible extraction quality.

**Why this priority**: The aggregation table is the core outcome of the application and converts ingest state into usable plan-year data.

**Independent Test**: Ingest filings or CSV metadata for multiple years including a duplicate plan year, then open All years and verify row order and preferred filing selection.

**Acceptance Scenarios**:

1. **Given** extracted records exist for multiple plan years, **When** the user opens All years, **Then** rows are ordered by ascending `planYearEndDate` and then `planYearBeginDate`.
2. **Given** two extracted records have the same plan year key, **When** the table is built, **Then** the preferred record is selected deterministically using the duplicate-year rule.

---

### User Story 2 - Export the visible table exactly (Priority: P1)

An analyst downloads or copies the table as CSV and gets the same columns and row order currently shown on screen.

**Why this priority**: Export is the primary deliverable consumed outside the application.

**Independent Test**: Toggle optional columns, export CSV, and confirm the header order and row order match the visible table.

**Acceptance Scenarios**:

1. **Given** the All years table is visible, **When** the user downloads CSV, **Then** the file contains the header row, visible columns only, and deterministic quoting rules.
2. **Given** the table contains commas, quotes, or line breaks, **When** CSV is generated, **Then** fields are quoted and escaped correctly using doubled quotes and LF endings.
3. **Given** the table has plan number, EIN, and year range data, **When** CSV is downloaded, **Then** the filename includes those known segments plus `v0.7.0`.

---

### User Story 3 - Preserve typed extraction semantics even when stubbed (Priority: P2)

An analyst or future developer can inspect extracted records knowing that every field preserves raw text, normalized values, and parse status even though PDF scraping is still stubbed.

**Why this priority**: Strong typing and schema consistency are required now so later scraping work does not break the export contract.

**Independent Test**: Create extracted records from CSV rows and filename-only records, then verify typed containers and parse metrics exist for all mandatory fields.

**Acceptance Scenarios**:

1. **Given** a CSV-derived record, **When** extraction runs, **Then** the output contains typed containers for plan name, plan number, EIN, plan-year dates, filing kind, and received timestamp.
2. **Given** a local or remote PDF item without CSV metadata, **When** extraction runs, **Then** the output marks unsupported fields as missing and still records a valid `ingestionTimestamp`.

---

### Edge Cases

- Records missing one or both plan-year dates stay visible but do not collapse unrelated rows into the same aggregate key.
- CSV export omits unknown filename segments cleanly rather than inserting placeholder punctuation.
- Optional schema-registry columns with missing values render as blank cells instead of error text.
- Duplicate-year records with equal received timestamps fall back to filing-kind preference and then ingestion timestamp consistently.

## Constitution Alignment *(mandatory)*

- Single-file delivery impact: Aggregation, sorting, column selection, clipboard copy, and CSV generation all run in the browser and ship inside the same HTML file.
- Privacy impact: Extracted objects are held in memory only; export is strictly user-triggered.
- Accessibility impact: The All years tab, export buttons, and column chooser are keyboard-accessible and inherit visible focus/high contrast styles.
- Determinism impact: Schema registry order, duplicate selection rules, and CSV formatting rules fully determine output order and content.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an `All years` tab.
- **FR-002**: The system MUST aggregate extracted data at a default grain of one row per `(planYearBeginDate, planYearEndDate)`.
- **FR-003**: Duplicate-year aggregation MUST prefer the record with the latest received timestamp when available.
- **FR-004**: If received timestamps do not resolve a duplicate-year tie, the system MUST prefer amended over original and final over non-final.
- **FR-005**: If duplicate-year ties still remain, the system MUST prefer the newest ingestion timestamp.
- **FR-006**: The table MUST always place mandatory columns first in the required order: `planName`, `planNumber`, `sponsorEmployerIdentificationNumber`, `planYearBeginDate`, `planYearEndDate`, `filingKind`, `receivedTimestamp`, `extractionQuality`.
- **FR-007**: Additional exportable columns MUST come from a schema registry filtered by `exportGroup = "allYears"` and ordered by `exportOrder`.
- **FR-008**: The system MUST provide `Download CSV` and `Copy CSV` actions for the visible All years table.
- **FR-009**: CSV output MUST include a header row, quote fields containing comma, quote, or newline, double embedded quotes, and use LF endings.
- **FR-010**: CSV export filename MUST follow `form5500-all-years-<planNumber>-<employerIdentificationNumber>-<minEndYear>-<maxEndYear>-v<version>.csv` while omitting unknown segments cleanly.
- **FR-011**: The system MUST implement a schema registry entry structure that includes `fieldId`, `name`, `headerLabel`, `dataType`, `locationRef`, `exportGroup`, and `exportOrder`.
- **FR-012**: The system MUST implement the `FieldValue` container with raw text, normalized typed values, parse status, and parse notes.
- **FR-013**: The v0.7.0 extractor MUST set `ingestionTimestamp`, use CSV metadata when available, infer plan-year dates from obvious filename patterns when possible, and otherwise emit missing typed fields.

### Key Entities *(include if feature involves data)*

- **Schema Registry Entry**: In-memory field definition that governs typing, headers, export group membership, ordering, and official location references.
- **FieldValue**: Typed value container preserving source text, normalized values, parse status, and notes.
- **Extracted Filing Record**: Aggregate-ready object containing mandatory fields, schema-driven field values, metrics, and ingest timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The All years table renders one deterministic row per plan year for all ingested records in the current session.
- **SC-002**: CSV export output remains byte-for-byte stable when the underlying extracted records and visible columns do not change.
- **SC-003**: Unit tests validate CSV escaping, sorting, duplicate selection, normalization, and EFAST CSV mapping without external services.
- **SC-004**: Export filenames always include `v0.7.0` and omit missing data segments without producing duplicate separators.

## Assumptions

- PDF scraping remains stubbed in v0.7.0, so many optional schema fields will be blank.
- CSV metadata from EFAST exports is sufficiently reliable for basic plan identifiers and dates.
- Clipboard copy may fail in some browser contexts, in which case download remains the required export path.
