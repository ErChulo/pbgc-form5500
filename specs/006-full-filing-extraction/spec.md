# Feature Specification: Full Filing Package Extraction

**Feature Branch**: `[006-full-filing-extraction]`  
**Created**: 2026-04-04  
**Status**: Draft  
**Input**: User description: "Extract all material plan attributes from full Form 5500 filing packages, including all applicable schedules, attached financial statements, and reviewable exceptions, with optional OCR support for scanned filings in a later phase."

## Clarifications Applied

- This feature targets full standard Form 5500 filing packages and their attachments, not only the current limited all-years export slice.
- The extraction target is all materially useful plan attributes available in the filing package for the filing year, including schedule-specific fields and attachment-derived values.
- OCR support is treated as a later phase dependency and does not block the text-searchable full-extraction scope of this feature.
- The system must surface unresolved, conflicting, masked, or attachment-derived values explicitly instead of silently dropping them or fabricating values.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Extract A Complete Filing Record (Priority: P1)

A user ingests a text-searchable full Form 5500 filing package and expects to receive a materially complete extracted record containing the plan’s core identifiers, participant counts, financial fields, schedule-derived values, and attachment-derived values in one reviewable result.

**Why this priority**: This is the core business outcome. If a full filing cannot be turned into a materially complete structured record, the feature fails its purpose.

**Independent Test**: Can be fully tested by ingesting a representative text-searchable filing package with multiple schedules and attachments and confirming that the extracted record contains the expected plan-level, schedule-level, and attachment-level values with typed outputs.

**Acceptance Scenarios**:

1. **Given** a text-searchable Form 5500 package with applicable schedules and audited financial statements, **When** the user ingests the filing, **Then** the system returns one extracted record containing all detected plan attributes from the main form, schedules, and attachments with field-level parse states.
2. **Given** a filing package where a value appears only in an attachment rather than in the schedule body, **When** the filing is processed, **Then** the extracted record includes that value and identifies that it was derived from an attachment.
3. **Given** a filing package with multiple applicable schedules, **When** the filing is processed, **Then** the extracted record includes schedule-specific attributes only for schedules actually present in the package.

---

### User Story 2 - Review Exceptions And Coverage (Priority: P2)

A user reviews the extracted filing and needs to know which values were confidently extracted, which remain unresolved, which were masked or placeholder-like in the source, and which require manual follow-up.

**Why this priority**: Full extraction without clear review states is not operationally trustworthy. Users must be able to see the difference between a real missing value, a masked source value, a conflicting source, and an unsupported pattern.

**Independent Test**: Can be fully tested by ingesting filings containing a mix of parsed, masked, missing, and conflicting values and confirming that the review output distinguishes those states without ambiguity.

**Acceptance Scenarios**:

1. **Given** a filing package where some values are extracted and others are masked in the source, **When** the user reviews the result, **Then** the system shows parsed fields separately from masked, missing, conflicting, and not-applicable fields.
2. **Given** a filing package where two document sections disagree on a value, **When** the record is built, **Then** the system flags the conflict and shows the candidate values and their sources.
3. **Given** a filing package where a required schedule is absent, **When** the user reviews the result, **Then** the system marks schedule-bound fields from that schedule as not applicable rather than parse failures.

---

### User Story 3 - Produce Complete Cross-Year Outputs (Priority: P3)

A user ingests multiple filing years for the same plan and wants the All years view and export outputs to include the materially complete attribute set, not just a small subset of fields.

**Why this priority**: The practical value of extraction is in comparing filings over time, and that comparison breaks if only a narrow slice of fields can be exported.

**Independent Test**: Can be fully tested by ingesting multiple filing years for one plan and confirming that the All years view and exported output contain the expanded field set with consistent column definitions and deterministic year ordering.

**Acceptance Scenarios**:

1. **Given** multiple years of filings for the same plan, **When** the user opens the All years view, **Then** the expanded attribute set appears in stable column order across all years.
2. **Given** duplicate or amended filings for the same filing year, **When** the user exports the All years dataset, **Then** the system applies deterministic record selection rules and preserves exception visibility for the retained record.
3. **Given** a filing year where some attributes are unavailable, **When** the user exports the data, **Then** the output preserves the distinction between parsed, unresolved, masked, conflicting, and not-applicable states.

---

### User Story 4 - Handle Scanned Filings As A Follow-On Phase (Priority: P4)

A user may later ingest image-only or scanned filing packages and expects those filings to fit the same extraction and review model once OCR is enabled.

**Why this priority**: Scanned filings matter to the end-state product, but they should not blur the requirements for completing text-searchable full extraction first.

**Independent Test**: Can be fully tested in a later phase by ingesting scanned filings and confirming that OCR-derived fields use the same review states and output model as native-text filings.

**Acceptance Scenarios**:

1. **Given** a scanned filing package in a later OCR-enabled phase, **When** the user ingests the filing, **Then** the system returns the same structured record format and review-state model used for text-searchable filings.

### Edge Cases

- A filing contains values only in attached audited financial statements or actuarial attachments rather than in the main schedule body.
- A filing contains multiple schedules of the same family or supplemental schedules with overlapping values.
- A filing contains masked, placeholder, or obviously non-production values that resemble numbers but should not be treated as validated extraction.
- A filing contains conflicting values between the main form, a schedule, and an attachment.
- A filing contains amended-year duplicates or multiple filings for the same plan year.
- A filing contains a schedule marker in the table of contents or cover pages that should not count as field evidence.
- A filing includes irrelevant attachments that resemble schedule text but are not valid value sources.
- A filing omits an otherwise common schedule and the system must not report that omission as a parser failure.

## Constitution Alignment *(mandatory)*

- Single-file delivery impact: The feature must continue to ship as one self-contained browser artifact with no backend dependency for extraction or review.
- Privacy impact: Filing contents must remain local to the user session unless the user explicitly exports results; no automatic remote transmission or persistence is allowed.
- Accessibility impact: Expanded extraction results, exceptions, and review states must remain keyboard-accessible, readable, and distinguishable without relying only on color.
- Determinism impact: Duplicate-year selection, cross-year ordering, field naming, and conflict reporting must be stable across repeated ingests of the same inputs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST extract all materially useful plan attributes available in a text-searchable full Form 5500 filing package for the filing year being processed.
- **FR-002**: The system MUST extract plan attributes from the main form, every applicable attached schedule present in the filing package, and qualifying attached financial or actuarial statements.
- **FR-003**: The system MUST maintain a canonical field catalog covering plan-level fields, schedule-level fields, and attachment-derived fields, with stable identifiers for display and export.
- **FR-004**: The system MUST support extraction from all schedules present in full Form 5500 packages, including Schedule A, Schedule C, Schedule D, Schedule G, Schedule H, Schedule I, Schedule MB, Schedule R, and Schedule SB when those schedules are present.
- **FR-005**: The system MUST identify which schedules are actually present in a filing package and apply schedule-bound fields only to those schedules.
- **FR-006**: The system MUST extract values from attachments when the filing package provides the only trustworthy source for a field in those attachments.
- **FR-007**: The system MUST record, for each extracted field, whether the value was parsed, missing, masked, conflicting, failed normalization, or not applicable.
- **FR-008**: The system MUST preserve source evidence for each extracted field sufficient for a user to understand where the value came from.
- **FR-009**: The system MUST distinguish between a genuinely missing value, a masked or placeholder source value, and a schedule that is not present.
- **FR-010**: The system MUST detect and surface conflicting candidate values when the filing package contains multiple incompatible values for the same canonical field.
- **FR-011**: The system MUST not silently fabricate values or mark placeholder-like values as validated extraction.
- **FR-012**: The system MUST produce a materially complete extracted record for each filing even when some fields remain unresolved, provided the record includes explicit review states for unresolved fields.
- **FR-013**: The system MUST expose the expanded field set in the single-filing review UI.
- **FR-014**: The system MUST expose the expanded field set in the All years view and export outputs using stable columns and stable field identifiers.
- **FR-015**: The system MUST preserve deterministic duplicate-year and amended-filing resolution rules for the expanded field set.
- **FR-016**: The system MUST report filing-level coverage metrics that indicate how complete the extracted record is and which categories remain unresolved.
- **FR-017**: The system MUST support representative-corpus validation workflows that compare extracted outputs against known-good expected values for all supported field categories.
- **FR-018**: The system MUST allow new field families and new schedule-specific fields to be added without redefining the entire extraction model.
- **FR-019**: The system MUST preserve the current text-searchable workflow even if scanned/OCR support is delivered later as a separate execution phase.
- **FR-020**: The system MUST ensure that any later OCR-enabled phase produces the same canonical field model, review states, and export contract as the text-searchable phase.

### Key Entities *(include if feature involves data)*

- **Canonical Field**: A stable extracted attribute representing one plan-level, schedule-level, or attachment-derived fact, including its field identifier, business meaning, applicability rules, and typed value expectations.
- **Filing Package**: A full ingested Form 5500 document set for one filing year, including the main form, attached schedules, embedded financial statements, actuarial attachments, and metadata used for deterministic record handling.
- **Field Evidence**: The source excerpt, source section, source page, and source type associated with a candidate field value.
- **Field Exception**: A reviewable issue attached to a canonical field, such as missing, masked, conflicting, parse-failed, or not-applicable.
- **Schedule Presence Record**: The detected applicability state of each schedule family within one filing package.
- **Corpus Validation Record**: The comparison between extracted values and expected values for a representative filing corpus, including coverage and unresolved-field summaries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a representative text-searchable validation corpus of full Form 5500 filings with known-good expected values, the system captures at least 95% of targeted core plan identifiers and at least 90% of targeted schedule and attachment attributes without misclassifying placeholder values as valid extraction.
- **SC-002**: For every filing in the representative validation corpus, users can see a complete field-by-field review state that distinguishes parsed, missing, masked, conflicting, failed, and not-applicable outcomes.
- **SC-003**: Users can ingest a multi-schedule filing package and review the full extracted record, including attachment-derived values, within one session using only the local single-file application.
- **SC-004**: The All years output for a representative multi-year plan corpus includes the expanded field set with deterministic year ordering and stable columns across repeated exports.
- **SC-005**: Duplicate or amended filings for the same filing year produce the same retained record and same exported result across repeated runs with identical inputs.
- **SC-006**: On the representative validation corpus, false-positive extraction of masked or placeholder numeric values remains below 1% of targeted numeric fields.

## Assumptions

- A representative validation corpus with known-good expected values will be available for text-searchable full Form 5500 packages before the feature is declared complete.
- OCR for scanned filings can be planned and delivered separately without changing the canonical field model defined by this feature.
- Users prefer explicit exception review over silent omission or fabricated fallback values.
- The single-file browser delivery model remains a hard product constraint.
- Some attributes may only be derivable from attachments and not from the main schedule body for certain filing families.
