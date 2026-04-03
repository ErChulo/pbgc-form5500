# Feature Specification: Numeric Schedule Validation Completion

**Feature Branch**: `004-numeric-schedule-validation`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "Finish numeric schedule extraction for Form 5500 using real non-placeholder filings so Schedule H, Schedule I, participant counts, and Schedule SB percentage fields can be validated and completed once actual populated PDFs are available."

## Clarifications Applied

- "Non-placeholder filings" means filings where the participant counts, schedule amounts, percentages, and related numeric fields contain actual populated values instead of masked or sample patterns such as repeated digits, repeated letters, or other stand-in content.
- This feature is limited to standard Form 5500 filings that already contain readable embedded text and real numeric values needed for validation.
- The feature completes validation and extraction quality for participant-count and schedule-number fields that remain incomplete after Feature 003.
- If an uploaded filing still contains masked or stand-in numeric values, the app treats that filing as structurally useful but not sufficient to prove numeric extraction completeness.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trust numeric values from real filings (Priority: P1)

An analyst ingests a standard Form 5500 filing with real populated participant and schedule numbers and receives a filing-year record where those numeric values are extracted accurately and transparently.

**Why this priority**: The remaining gap after the last release is not top-level identity data, but whether the app can reliably capture the actual participant and schedule numbers users care about.

**Independent Test**: Ingest a text-searchable standard Form 5500 filing containing real participant counts and real Schedule H, Schedule I, or Schedule SB values and verify that the filing-year record contains those numbers with the correct field statuses and source references.

**Acceptance Scenarios**:

1. **Given** a readable full Form 5500 with real populated participant counts, **When** the user ingests it, **Then** the participant-count fields are extracted into the filing-year record with the correct typed values and source locations.
2. **Given** a readable full Form 5500 with real populated schedule amounts or percentages, **When** the user ingests it, **Then** the relevant Schedule H, Schedule I, and Schedule SB fields are extracted into the correct canonical fields without borrowing values from headers, footers, or unrelated rows.

---

### User Story 2 - Separate valid numeric data from stand-in content (Priority: P1)

An analyst can tell whether a filing provided enough real numeric content to validate extraction or whether the filing only helped confirm document structure.

**Why this priority**: The product must not claim completion based on filings whose numeric fields are masked, sample-filled, or otherwise unsuitable for validation.

**Independent Test**: Ingest one filing with real populated numbers and one filing whose numeric fields use stand-in patterns, then verify that the first contributes validated numeric results while the second is clearly marked as insufficient for numeric validation.

**Acceptance Scenarios**:

1. **Given** a filing contains stand-in numeric content instead of real participant or schedule numbers, **When** extraction completes, **Then** the app does not promote those values as validated numeric extraction results and preserves an explicit indication that the filing is not suitable for numeric proof.
2. **Given** a filing contains real populated values in some numeric sections but not others, **When** extraction completes, **Then** the app preserves the valid extracted values while clearly marking the unsupported sections as unresolved or insufficient.

---

### User Story 3 - Prove completion against a representative corpus (Priority: P2)

An analyst or maintainer can verify completion of the remaining numeric extraction scope against a representative set of real filings and use that evidence to close the feature honestly.

**Why this priority**: The project needs a defensible completion bar instead of relying on anecdotal checks or structurally correct but numerically uninformative samples.

**Independent Test**: Run the agreed validation corpus of representative real filings and verify that the measured numeric extraction results meet the completion thresholds for participant counts and targeted schedule fields.

**Acceptance Scenarios**:

1. **Given** a representative corpus of real populated filings is available, **When** validation is run, **Then** the measured extraction results show whether the remaining numeric fields meet the completion criteria.
2. **Given** the validation corpus reveals a repeated numeric extraction failure pattern, **When** the review is complete, **Then** the failure is attributable to a specific field group or document pattern rather than being hidden inside aggregate success counts.

### Edge Cases

- A filing may contain real plan identifiers but masked participant or schedule numbers, and the app must distinguish "structurally useful" from "numerically validated."
- A filing may contain real values on one schedule and stand-in values on another, and the mixed result must remain explicit at field level.
- Some filings may show repeated-digit or repeated-letter content that resembles a value shape, and the app must avoid treating those patterns as proof of successful extraction.
- Different years may place participant or schedule numbers in slightly different row layouts, and validation must still map each value to the correct canonical field.
- A filing may include schedule pages but omit the numeric row needed for a particular field, and that absence must remain missing rather than being backfilled from nearby text.

## Constitution Alignment *(mandatory)*

- Single-file delivery impact: The feature preserves the existing single-file browser artifact and extends the validation and extraction coverage of the current data model.
- Privacy impact: All validation and extraction remain local in the browser, and representative filings are processed without transmitting document contents anywhere.
- Accessibility impact: Any new validation or insufficiency indicators remain visible, keyboard reachable, and compatible with the existing high-contrast workflow.
- Determinism impact: Numeric extraction must continue to emit typed field containers with stable status handling, stable field ordering, and repeatable results for the same filing set.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST extract participant-count fields from readable standard Form 5500 filings when those fields contain real populated values.
- **FR-002**: The system MUST extract targeted numeric fields from Schedule H, Schedule I, and Schedule SB when those values are explicitly present and readable in the filing.
- **FR-003**: The system MUST avoid assigning numeric values from unrelated headers, footers, continuation text, or neighboring rows to participant or schedule fields.
- **FR-004**: The system MUST preserve field-level typed results for every targeted numeric field, including raw text, normalized value, parse status, and source location.
- **FR-005**: The system MUST distinguish between a field that is unresolved because the filing lacked usable numeric evidence and a field that failed because extraction misread available evidence.
- **FR-006**: The system MUST identify when a filing's numeric sections contain stand-in or masked content that is unsuitable for proving extraction completeness.
- **FR-007**: The system MUST allow a representative corpus of real populated filings to be used as the basis for validating completion of the remaining numeric extraction scope.
- **FR-008**: The system MUST preserve all existing deterministic duplicate-year handling and all-years export behavior while the numeric extraction coverage is expanded.
- **FR-009**: The system MUST limit this feature to readable standard Form 5500 filings and MUST NOT broaden scope to other filing families or scanned-image OCR in this feature.

### Key Entities *(include if feature involves data)*

- **Numeric Validation Corpus**: A representative set of readable standard Form 5500 filings containing real participant and schedule numbers used to verify completion of the remaining numeric extraction scope.
- **Numeric Extraction Result**: The typed result for a participant-count or schedule-number field, including raw evidence, normalized value, status, and source reference.
- **Numeric Sufficiency Assessment**: The filing-level determination of whether the document provides enough real populated numeric content to count toward extraction completion evidence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For the agreed representative corpus of real populated standard Form 5500 filings, at least 95% of targeted participant-count and schedule-number fields that are explicitly present are extracted into the typed contract correctly.
- **SC-002**: In repeated runs with the same validation corpus, the system produces the same field statuses and normalized numeric results for the targeted participant and schedule fields.
- **SC-003**: Reviewers can distinguish within one pass whether a filing provided valid numeric proof, partial numeric proof, or structurally useful but numerically insufficient evidence.
- **SC-004**: Completion evidence identifies any remaining repeated numeric extraction failure by field group or document pattern instead of hiding it behind aggregate filing-level success.

## Assumptions

- Real completion of the remaining numeric extraction scope depends on access to a representative corpus whose participant and schedule values are genuinely populated rather than masked or sample-filled.
- Standard Form 5500 remains the target filing family for this feature; 5500-SF, 5500-EZ, and scanned-image OCR workflows are handled separately.
- The top-level identity extraction improvements from the merged Feature 003 work remain the baseline and do not need to be re-specified here.
- The existing typed-field contract, schema ordering, and all-years behavior remain the governing data model for this work.
