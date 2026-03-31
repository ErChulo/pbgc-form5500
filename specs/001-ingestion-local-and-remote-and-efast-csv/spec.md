# Feature Specification: Ingestion Local, Remote, and EFAST CSV

**Feature Branch**: `001-ingestion-local-and-remote-and-efast-csv`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "Build the ingestion interface covering local PDFs, drag-and-drop PDFs, pasted remote PDF URLs, and EFAST search CSV ingestion."

## Clarifications Applied

- The drag-and-drop target accepts both PDF files and CSV files even though only PDF support was strictly required.
- EFAST CSV uploads create queue items for filing rows rather than preserving the CSV file itself as a queue item.
- CSV rows without a PDF URL remain in the queue as `metadata-only` entries and still populate typed extracted data for the All years feature.
- Remote URLs are treated strictly as user-provided references; the application never programmatically fetches them.
- Remote-reference workflow always requires browser navigation plus manual download followed by local re-ingestion.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ingest local filings quickly (Priority: P1)

An analyst selects or drops multiple local Form 5500 PDFs and immediately sees them in one queue with status, size, preview, and removal controls.

**Why this priority**: Local ingestion is the fastest path to value and does not depend on network conditions.

**Independent Test**: Add at least 10 local PDFs via picker and drag-and-drop, preview one of them, and remove one without affecting the others.

**Acceptance Scenarios**:

1. **Given** the queue is empty, **When** the user selects multiple local PDFs, **Then** the queue shows one ready item per file with stable ingest identifiers.
2. **Given** a local PDF item is ready, **When** the user chooses Preview, **Then** the application opens the PDF using an object URL and revokes the URL on close.

---

### User Story 2 - Queue and manage remote PDF references (Priority: P1)

An analyst pastes multiple PDF URLs, queues them as references, opens them in the browser, downloads the files manually, and then re-ingests the local PDFs.

**Why this priority**: Remote URL ingestion is a core input mode and drives the shared queue behavior for later aggregation.

**Independent Test**: Paste 5 URLs, enqueue them, confirm the queue shows manual-download guidance, open one link in a new tab, download the PDF manually, and ingest the saved file locally.

**Acceptance Scenarios**:

1. **Given** remote URLs are pasted one per line, **When** the user adds them to the queue, **Then** each URL becomes a queued item with source type `remoteUrl`.
2. **Given** a queued remote reference, **When** the queue renders the item, **Then** the item explains that the user must open the link, download the PDF manually, and drag it back into the app.
3. **Given** a remote reference item exists, **When** the user chooses Open link, **Then** the browser opens the referenced URL in a new tab without the app fetching the document contents.

---

### User Story 3 - Ingest EFAST CSV search exports (Priority: P2)

An analyst uploads a CSV exported from the EFAST Form 5500 search site, sees one queue entry per filing row, and opens any PDF URLs present through the same manual-reference workflow used for pasted links.

**Why this priority**: CSV ingestion broadens discovery and metadata capture, but the queue foundation from local and remote modes must exist first.

**Independent Test**: Upload an EFAST CSV export with case or spacing variations in the headers, confirm row-level queue items appear, and open any discovered PDF URLs manually.

**Acceptance Scenarios**:

1. **Given** a valid EFAST CSV export, **When** the file is uploaded, **Then** the app maps filing rows into `remoteFromCsv` queue items and preserves the original row as metadata.
2. **Given** a CSV row has a PDF URL, **When** the queue renders the row, **Then** it uses the same manual-download guidance and Open link action as pasted links.
3. **Given** a CSV row lacks a PDF URL, **When** the queue renders the item, **Then** the status is `metadata-only` and the app explains how to add the missing PDF manually.

---

### Edge Cases

- Mixed drag-and-drop payloads containing both PDFs and CSVs are split and routed to the correct ingest path.
- Duplicate URLs or duplicate CSV rows remain separate queue items because each ingest action receives a stable internal identifier.
- Remote references may point to sites with strict CORS or download policies, but the app still behaves correctly because it never programmatically fetches the files.
- CSV files with unrecognized headers still ingest rows as metadata where possible and leave unmatched fields empty rather than aborting the entire file.

## Constitution Alignment *(mandatory)*

- Single-file delivery impact: The feature only adds browser-side DOM, inline script, and inline CSS logic that build into one HTML file.
- Privacy impact: Uploaded PDFs, CSV contents, and downloaded bytes remain in memory; only derived metadata appears in state unless the user exports.
- Accessibility impact: File inputs, drop target, tabs, queue actions, and preview controls are keyboard-operable with visible focus and high contrast support.
- Determinism impact: Every queue item receives a stable ingest ID and consistent status taxonomy across all four input modes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept multiple local PDFs through a keyboard-accessible file picker.
- **FR-002**: The system MUST accept multiple local PDFs through drag-and-drop.
- **FR-003**: The system MUST provide a text area that accepts one remote URL per line and turns each line into a queued item with source type `remoteUrl`.
- **FR-004**: The system MUST treat pasted remote URLs as reference items only and MUST NOT programmatically fetch their document contents.
- **FR-005**: Remote queue items MUST support open-link and remove actions and MUST explain the manual download plus local re-ingestion workflow.
- **FR-006**: The system MUST present the same manual-download guidance for CSV-derived rows that include remote PDF URLs.
- **FR-007**: The application MUST NOT persist remote document bytes automatically because remote document bytes are never fetched by the app.
- **FR-008**: The system MUST accept an uploaded EFAST CSV export and parse filing rows using header mapping robust to case and spacing variations.
- **FR-009**: CSV-derived queue items MUST store traceable original row metadata and use `sourceType = remoteFromCsv`.
- **FR-010**: CSV rows with a PDF URL MUST use the same reference-item and Open link workflow as pasted remote URLs.
- **FR-011**: CSV rows without a PDF URL MUST remain visible as metadata-only queue items and present guidance for manual PDF addition.
- **FR-012**: The queue table MUST be consolidated across all ingest modes and include columns for source type, name, size when known, status, progress, and actions.
- **FR-013**: Any queue item with a PDF Blob MUST support Preview via an object URL that is revoked when preview closes.

### Key Entities *(include if feature involves data)*

- **Queue Item**: A stable ingest record representing one local PDF, remote URL, or CSV-derived filing row, with status, progress, actions, and trace metadata.
- **Remote Reference Item**: The runtime state for a queued remote item, including its external URL, guidance text, and manual re-ingestion path.
- **CSV Filing Row Metadata**: Canonical fields and original row values extracted from EFAST CSV input for traceability and later typed extraction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add at least 10 local PDFs and complete preview or removal actions without reloading the page.
- **SC-002**: Users can queue at least 5 remote URLs, open them in new tabs, download the PDFs manually, and re-ingest the saved files within the same session.
- **SC-003**: Uploading a valid EFAST CSV export produces queue entries for its filing rows in under 3 seconds for files up to 1,000 rows on a typical laptop.
- **SC-004**: Every queued remote reference surfaces an actionable manual-download explanation without losing the queued item.

## Assumptions

- Users provide lawful access to any remote PDF URLs they paste or import from CSV.
- `remoteFromCsv` items without a PDF URL still provide useful metadata for later aggregation.
- PDF content extraction beyond simple metadata inference is out of scope for v0.7.0 and will be stubbed.
