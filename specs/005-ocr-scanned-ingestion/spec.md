# Feature Specification: OCR Scanned Filing Ingestion

**Feature Branch**: `005-ocr-scanned-ingestion`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "Add OCR-assisted ingestion for scanned or image-only Form 5500 PDFs so users can ingest older non-text-searchable filings directly in the app, recover as many explicit values as possible, see confidence and unresolved-field review states, and fall back to manual remediation only when OCR is insufficient."

## Clarifications Applied

- This feature applies to scanned or image-only standard Form 5500 PDFs that do not provide enough embedded text for the existing extraction workflow.
- OCR assistance is intended to recover explicit values already visible on the filing; it does not authorize inferred or invented values.
- When OCR quality is insufficient, the product preserves the filing, exposes what remains unresolved, and guides the user to the existing manual remediation path instead of failing silently.
- This feature expands ingestion capability for scanned filings but does not change the privacy model, the single-file distribution model, or the typed-field contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ingest a scanned filing directly (Priority: P1)

An analyst drops in a scanned or image-only standard Form 5500 PDF and still receives a structured filing-year record without needing to pre-convert the document outside the app first.

**Why this priority**: This is the core user value of the feature and closes the biggest gap for older archival filings that are not text-searchable.

**Independent Test**: Ingest a scanned standard Form 5500 PDF with no usable embedded text and verify that the app attempts OCR, produces a filing-year record, and surfaces extracted fields through the normal workflow.

**Acceptance Scenarios**:

1. **Given** a scanned or image-only standard Form 5500 PDF, **When** the user ingests it, **Then** the app attempts OCR automatically and continues through the normal filing extraction workflow without requiring an external pre-conversion step.
2. **Given** OCR recovers explicit filing values, **When** extraction completes, **Then** those values appear in the filing-year record using the same typed-field structure as text-native filings.

---

### User Story 2 - Understand confidence and gaps after OCR (Priority: P1)

An analyst can see which fields were recovered confidently, which remain unresolved, and which still require manual attention after OCR completes.

**Why this priority**: OCR output is inherently less trustworthy than native-text extraction, so users need explicit quality signals to decide whether the result is usable.

**Independent Test**: Ingest a scanned filing with mixed OCR quality and verify that recovered fields, unresolved fields, and exception states remain visible without opening developer tools.

**Acceptance Scenarios**:

1. **Given** OCR recovers some fields but leaves others ambiguous, **When** extraction completes, **Then** the app clearly distinguishes recovered values from unresolved fields and preserves the unresolved set for review.
2. **Given** OCR yields low-confidence or ambiguous evidence for a field, **When** the filing result is shown, **Then** the app does not present that field as a clean success without also surfacing the review state.

---

### User Story 3 - Fall back gracefully when OCR is not enough (Priority: P2)

An analyst can keep the filing in the workflow even when OCR is insufficient and receives clear guidance about what to do next.

**Why this priority**: Scanned-document support is only trustworthy if failure modes are explicit and do not force users to guess why extraction was incomplete.

**Independent Test**: Ingest a poor-quality scanned filing and verify that the app preserves the filing, identifies unresolved areas, and guides the user to manual remediation.

**Acceptance Scenarios**:

1. **Given** OCR is insufficient to recover enough explicit content for reliable extraction, **When** processing completes, **Then** the app preserves the filing, marks extraction as incomplete, and guides the user to the manual remediation workflow.
2. **Given** a user later provides a better version of the same filing, **When** it is re-ingested, **Then** the improved result can replace the prior incomplete result through the existing deterministic filing workflow.

### Edge Cases

- A scanned filing may contain a mix of readable machine text and page images, and the app must use the best available evidence without duplicating values.
- OCR may recover field labels but not the adjacent values, and those fields must remain unresolved rather than being guessed.
- OCR may confuse punctuation, minus signs, parentheses, or percentages, and the app must preserve raw evidence while avoiding false numeric certainty.
- A filing may contain repeated headers, stamped text, or skewed pages that create duplicate OCR candidates, and the app must not assign those artifacts to the wrong field.
- Some pages may OCR successfully while others remain unreadable, and the filing result must represent that mixed quality explicitly.

## Constitution Alignment *(mandatory)*

- Single-file delivery impact: The feature must preserve the single self-contained browser artifact while adding scanned-filing ingestion capability.
- Privacy impact: OCR and downstream extraction must continue to run locally in the browser without transmitting filing contents anywhere.
- Accessibility impact: OCR progress, confidence signals, unresolved-field messaging, and remediation guidance must remain keyboard reachable and visually understandable in normal and high-contrast modes.
- Determinism impact: OCR-assisted extraction must still emit the existing typed-field containers, maintain stable duplicate handling, and avoid introducing non-deterministic output for the same filing input.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST detect when an ingested standard Form 5500 PDF lacks sufficient embedded text for the normal extraction workflow.
- **FR-002**: The system MUST attempt OCR for scanned or image-only standard Form 5500 filings before directing users to manual remediation.
- **FR-003**: The system MUST feed OCR-recovered text into the same canonical filing-year extraction workflow used for text-native filings.
- **FR-004**: OCR-assisted extraction MUST preserve the existing typed-field contract, including raw text, normalized value, parse status, and source location where available.
- **FR-005**: The system MUST distinguish OCR-recovered fields from unresolved or ambiguous fields clearly enough for a user to review the result without developer tools.
- **FR-006**: The system MUST avoid presenting OCR guesses as clean successes when the available evidence is insufficiently reliable.
- **FR-007**: If OCR is insufficient for reliable extraction, the system MUST preserve the filing in the workflow, mark extraction as incomplete, and direct the user to manual remediation.
- **FR-008**: The system MUST preserve existing all-years aggregation and deterministic duplicate-year behavior when OCR-assisted filings are included.
- **FR-009**: The system MUST limit this feature to standard Form 5500 scanned or image-only filings and MUST NOT broaden scope to unrelated filing families in this feature.

### Key Entities *(include if feature involves data)*

- **Scanned Filing Input**: A standard Form 5500 PDF whose embedded text is missing or insufficient for the normal extraction workflow.
- **OCR Recovery Result**: The filing-level outcome of the OCR attempt, including recovered text evidence, unresolved regions, and readiness for downstream extraction.
- **OCR Review State**: The field- and filing-level indication of what was recovered, what remains ambiguous, and whether manual remediation is required.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can ingest a representative set of scanned or image-only standard Form 5500 PDFs without leaving the app for pre-conversion in at least 90% of cases where the filing text is visually legible.
- **SC-002**: For the same scanned filing input, repeated runs produce the same filing-level completion state and the same resolved versus unresolved field breakdown.
- **SC-003**: Reviewers can identify within one pass which OCR-assisted fields were recovered, which remain unresolved, and whether manual remediation is required.
- **SC-004**: When OCR is insufficient, users still retain the filing in the workflow and receive explicit next-step guidance instead of a silent failure or discarded record.

## Assumptions

- Scanned-file support is a follow-up feature and does not retroactively change the completion status of the text-native extraction work already merged.
- Standard Form 5500 remains the target filing family for this feature; other form families remain out of scope unless specified separately.
- OCR quality will vary by filing condition, so some scanned filings will still require explicit manual remediation.
- The existing queue, typed-field contract, and all-years dataset remain the governing workflow for OCR-assisted results.
