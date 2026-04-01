# Feature Specification: Full 5500 Extraction

**Feature Branch**: `003-full-5500-extraction`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "Do all 4 listed items you said above, so that the user can get all functionally dependent attributes of each form 5500 year. You can make use of any js library."

## Clarifications

### Session 2026-03-31

- Q: Should the first full-extraction release support every schedule type that can appear in a standard Form 5500 filing, or only a priority subset? → A: Support every schedule type that can appear in a standard Form 5500 filing from the first release.
- Q: Should the first full-extraction release support every historical standard Form 5500 year, or only a bounded filing-year range? → A: Support every historical standard Form 5500 year from the first release.
- Q: Should the first full-extraction release include OCR fallback for image-only or degraded PDFs? → A: Include OCR fallback, and if OCR is insufficient, direct the user to a pre-converted text-searchable PDF workflow.
- Q: Should the extraction dataset include only values explicitly present on the filing, or also derived values? → A: Extract only values explicitly present on the filing; do not add derived values.

## Clarifications Applied

- "All functionally dependent attributes" is interpreted to mean every reportable field value that belongs to a single filing-year record on the main Form 5500 and any attached schedules included in that filing package.
- The first full-extraction release covers every schedule type that can appear in a standard Form 5500 filing package, not just a priority subset.
- The feature covers every historical standard Form 5500 year and uses year-specific extraction mappings so a filing is interpreted according to the instructions year that matches the filing year being processed.
- If a schedule is not attached for a filing year, its fields are treated as not applicable rather than extraction failures.
- If a PDF is image-only, corrupted, or otherwise unreadable as text, the app must attempt OCR first; if OCR is still insufficient, the app must preserve the filing, mark extraction as incomplete, and direct the user to a pre-converted text-searchable PDF workflow.
- The extraction dataset is limited to values explicitly present on the filing and its attached schedules; this feature does not add derived values beyond the existing extraction quality metrics.
- The extraction result must populate the existing typed-field contract rather than introducing a second parallel data model.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Extract a complete filing-year record from a Form 5500 package (Priority: P1)

An analyst ingests one or more Form 5500 filings and receives a populated filing-year record containing every supported field from the main form and any schedules included with that filing.

**Why this priority**: This is the core product outcome that turns a filing PDF into usable structured data instead of metadata placeholders.

**Independent Test**: Ingest a filing package containing the main form plus at least one attached schedule and verify that the filing-year record contains populated values, typed normalization, and field-level source locations for all fields present in the source.

**Acceptance Scenarios**:

1. **Given** a readable Form 5500 PDF package, **When** the user ingests it, **Then** the system extracts the main-form fields and all fields from every attached schedule type present in the filing into the filing-year record.
2. **Given** a filing package omits a schedule, **When** extraction completes, **Then** fields tied to that schedule are marked not applicable or missing without being misreported as parsing errors.
3. **Given** a field is present in the PDF, **When** extraction completes, **Then** the field contains raw text, normalized typed value, parse status, and a location reference pointing to the source line item.

---

### User Story 2 - Build a complete all-years dataset across filings (Priority: P1)

An analyst ingests filings from multiple years and receives an all-years dataset where each plan year includes the full set of extracted attributes governed by the schema registry.

**Why this priority**: Users need a dependable year-over-year dataset, not isolated one-off filing extracts.

**Independent Test**: Ingest filings for multiple years, including a duplicate plan year, and verify that the all-years table and CSV export include the full extracted attribute set for the preferred filing-year record.

**Acceptance Scenarios**:

1. **Given** multiple filing-year extracts exist, **When** the user opens All years, **Then** the table includes all supported exported attributes in stable order for the preferred filing-year record.
2. **Given** duplicate filings exist for the same plan year, **When** the all-years dataset is built, **Then** the preferred filing is selected deterministically and its extracted attributes populate the row.
3. **Given** a supported field is extracted in one year but absent in another, **When** the dataset renders, **Then** both years stay aligned under the same schema-driven columns and the missing value remains explicit without introducing derived substitutes.

---

### User Story 3 - Trust incomplete or exception-heavy filings without losing traceability (Priority: P2)

An analyst can distinguish between fields that were parsed successfully, fields that were not applicable, and fields that could not be resolved because of source quality or ambiguity.

**Why this priority**: Full extraction requires users to trust the quality signals as much as the values themselves.

**Independent Test**: Ingest at least one degraded or partially unreadable filing and verify that unresolved fields remain visible with parse status, field-level notes, and extraction quality metrics.

**Acceptance Scenarios**:

1. **Given** a filing has unreadable or ambiguous text for some fields, **When** extraction finishes, **Then** the unresolved fields retain raw evidence where available and are marked failed or missing with notes.
2. **Given** a filing is image-only or text extraction is insufficient, **When** extraction completes, **Then** the app attempts OCR and, if OCR remains insufficient, preserves the filing in the queue, marks extraction as incomplete, identifies the unresolved field set, and directs the user to a pre-converted text-searchable PDF workflow.

---

### Edge Cases

- A filing package may contain multiple schedules of different types, and extraction must merge every attached schedule type into one filing-year record without field collisions.
- A filing year may use line-item wording or layout variations from a different instructions year, and mappings must use the correct historical year-specific schema.
- A filing may include amended or final indicators in different locations, and the extracted filing-kind field must remain normalized consistently.
- Some numeric values may appear with parentheses, percentages, or merged OCR artifacts, and normalization must preserve raw text while distinguishing parsed from failed values.
- OCR may partially recover a degraded filing but still leave unresolved regions, and the app must distinguish OCR-assisted parsed values from fields that still require manual re-preparation.
- A filing may contain duplicate page headers, repeated line labels, or continuation pages, and extraction must not assign the wrong value to the wrong field.
- Users may expect analytical rollups or inferred values, but the feature must not present any value that does not appear explicitly on the filing or attached schedules.

## Constitution Alignment *(mandatory)*

- Single-file delivery impact: The feature preserves the one-file browser distribution while replacing stub extraction with real structured extraction.
- Privacy impact: PDF parsing and value extraction remain local in the browser, and extracted results are exported only on explicit user action.
- Accessibility impact: The feature adds extraction detail and exception visibility without removing keyboard operation, visible focus, or high-contrast support.
- Determinism impact: The schema registry remains the single column authority, and each extracted field continues to use typed containers with stable ordering and location references.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST extract all supported main-form fields from each ingested Form 5500 filing package.
- **FR-002**: The system MUST extract all fields from every attached schedule type included in a standard Form 5500 filing package and merge them into the same filing-year record.
- **FR-003**: The system MUST maintain year-specific field mappings for every historical standard Form 5500 year so each extracted field is interpreted according to the filing year’s applicable instructions.
- **FR-004**: Every extracted field MUST populate the typed field container with raw text, normalized typed value, parse status, and parse notes when needed.
- **FR-005**: Every schema registry entry used for extraction MUST include a location reference that corresponds to the official form or schedule line item for the applicable instructions year.
- **FR-006**: The system MUST distinguish between fields that are parsed, missing, failed, and not applicable due to schedule absence.
- **FR-007**: If text extraction cannot reliably resolve a field, the system MUST preserve any available raw evidence and mark the field as unresolved rather than inventing a value.
- **FR-007A**: The system MUST attempt OCR when a filing or page lacks sufficient embedded text for extraction.
- **FR-008**: The system MUST update the filing-year extraction metrics so users can see how many expected fields were successfully parsed for each filing.
- **FR-009**: The all-years table MUST include the complete exported attribute set from the schema registry, not only the current minimal subset.
- **FR-010**: CSV export MUST include the same visible columns and row ordering shown in the all-years table after full extraction is applied.
- **FR-011**: The system MUST preserve deterministic duplicate-year selection after real extraction is introduced.
- **FR-012**: The system MUST surface extraction exceptions clearly enough that users can identify which fields or schedules need manual review.
- **FR-013**: The system MUST continue to support local-file workflows even when some filings can only be partially extracted.
- **FR-014**: The system MUST not reject a standard Form 5500 filing solely because it belongs to an older historical filing year.
- **FR-015**: If OCR remains insufficient for reliable extraction, the system MUST guide the user to provide a pre-converted text-searchable PDF and then reprocess that filing.
- **FR-016**: The extraction dataset MUST contain only values explicitly present on the filing or attached schedules and MUST NOT introduce derived analytical values in this feature.

### Key Entities *(include if feature involves data)*

- **Extraction Schema Set**: The year-aware collection of field definitions that maps every supported Form 5500 and schedule field to a canonical extracted field.
- **Field Extraction Result**: The typed field container plus source evidence and parse-quality details for a single extracted field.
- **Filing-Year Extraction Record**: The complete structured result for one filing year, containing the main form, attached schedules, quality metrics, and duplicate-resolution inputs.
- **Extraction Exception**: A user-visible record explaining why a field, schedule, or filing could not be fully resolved.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a representative set of readable standard Form 5500 filings spanning historical years and attached schedules, at least 95% of fields from the main form and every schedule type present are extracted into the typed contract without manual intervention.
- **SC-002**: Users can ingest multi-year filings and produce a complete all-years CSV where every supported exported attribute appears in stable order for each year.
- **SC-003**: Users can identify unresolved fields and their source locations within one review pass without opening developer tools or inspecting internal state.
- **SC-004**: Duplicate-year selection remains stable across repeated runs with the same input filings and produces the same all-years output each time.

## Assumptions

- The first full-extraction release targets standard Form 5500 filings and every schedule type that can appear in those filing packages; separate filing families such as 5500-SF or 5500-EZ remain out of scope unless specified later.
- Readable text-based PDFs are the primary target; image-only or severely degraded PDFs may produce partial extraction with explicit exception reporting.
- OCR is available as a fallback for image-only or degraded filings, but some filings may still require user-supplied pre-converted text-searchable PDFs.
- The schema registry can be expanded to cover all supported fields while remaining the single authority for exported column order and location references.
