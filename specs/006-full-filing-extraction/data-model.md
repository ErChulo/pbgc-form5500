# Data Model: Full Filing Package Extraction

## FilingPackage

- **Purpose**: Represents one ingested Form 5500 package for a single filing year.
- **Key fields**:
  - `ingestId`
  - `fileName`
  - `filingYear`
  - `filingKind`
  - `pageCount`
  - `textSource`
  - `detectedSchedules[]`
  - `duplicateResolutionState`
  - `coverageMetrics`
- **Relationships**:
  - Has many `SourceDocumentPage`
  - Has many `CanonicalFieldValue`
  - Has many `FieldEvidence`
  - Has many `FieldException`

## SourceDocumentPage

- **Purpose**: Represents one extracted text page from the filing package.
- **Key fields**:
  - `pageNumber`
  - `sectionType` (`main-form`, `schedule`, `financial-statement`, `actuarial-attachment`, `other-attachment`, `unknown`)
  - `normalizedText`
  - `scheduleContext`
- **Relationships**:
  - Belongs to one `FilingPackage`
  - Can contribute to many `FieldEvidence` records

## CanonicalFieldDefinition

- **Purpose**: Describes one stable user-visible field in the expanded extraction schema.
- **Key fields**:
  - `fieldId`
  - `headerLabel`
  - `dataType`
  - `exportGroup`
  - `exportOrder`
  - `locationRef`
  - `supportedSchedules[]`
  - `sourcePreferenceRules[]`
  - `validationRules[]`
- **Relationships**:
  - Has many `CanonicalFieldValue` instances across filings

## CanonicalFieldValue

- **Purpose**: Holds the typed result for one canonical field in one filing package.
- **Key fields**:
  - `fieldId`
  - `rawText`
  - `valueText`
  - `valueNumber`
  - `valueDate`
  - `valueBoolean`
  - `valueCode`
  - `parseStatus`
  - `parseNotes`
  - `resolutionState`
  - `sourceSelectionState`
- **Validation rules**:
  - Must always exist for every field in the active schema
  - Must preserve typed-container shape even when unresolved
  - `parseStatus` must be one of `parsed`, `missing`, `failed`
  - `resolutionState` must align with associated exceptions and evidence
- **Relationships**:
  - Belongs to one `FilingPackage`
  - References one `CanonicalFieldDefinition`
  - Can have many `FieldEvidence`
  - Can have many `FieldException`

## FieldEvidence

- **Purpose**: Captures candidate or selected source evidence for a canonical field value.
- **Key fields**:
  - `fieldId`
  - `status` (`parsed`, `candidate`, `conflicting`)
  - `sourceType` (`main-form`, `schedule`, `financial-statement`, `actuarial-attachment`, `other-attachment`)
  - `sourcePage`
  - `sourceLabel`
  - `excerpt`
  - `confidenceBand`
- **Validation rules**:
  - Parsed values should have at least one evidence record
  - Conflicting values must preserve at least two incompatible evidence candidates

## FieldException

- **Purpose**: Records why a field is unresolved or requires review.
- **Key fields**:
  - `fieldId`
  - `code` (`missing`, `masked-numeric-evidence`, `parse-failed`, `schedule-not-present`, `conflict`, `attachment-only`, `unsupported-pattern`)
  - `message`
  - `sourcePage`
  - `sourceLabel`
- **Validation rules**:
  - Exception codes must be stable and exportable
  - `schedule-not-present` may only appear for schedule-bound fields

## SchedulePresenceRecord

- **Purpose**: Tracks whether a schedule family is present, absent, or ambiguous for one filing package.
- **Key fields**:
  - `scheduleCode`
  - `presenceState` (`present`, `absent`, `ambiguous`)
  - `detectedPages[]`
  - `evidenceExcerpts[]`

## FilingCoverageMetrics

- **Purpose**: Summarizes how complete one extracted filing is.
- **Key fields**:
  - `parsedFieldCount`
  - `missingFieldCount`
  - `maskedFieldCount`
  - `conflictFieldCount`
  - `notApplicableFieldCount`
  - `attachmentDerivedFieldCount`
  - `coverageByCategory`
  - `overallCompletionBand`

## CorpusValidationRecord

- **Purpose**: Compares extracted output with expected values for one filing in the representative corpus.
- **Key fields**:
  - `fixtureId`
  - `expectedFieldCount`
  - `matchedFieldCount`
  - `maskedFieldCount`
  - `conflictFieldCount`
  - `unexpectedValueCount`
  - `falsePositiveCount`
  - `coverageBySchedule`
  - `coverageBySourceType`
