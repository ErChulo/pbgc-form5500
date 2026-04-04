# Extraction Output Contract: Full Filing Package Extraction

## Purpose

Define the stable user-visible extraction contract for single-filing review, all-years aggregation, and corpus validation.

## Filing Record Contract

Each ingested filing package produces one record with:

- `ingestId`
- `fileName`
- `filingYear`
- `filingKind`
- `detectedSchedules[]`
- `fields`
- `evidence[]`
- `exceptions[]`
- `metrics`

## Field Contract

Every canonical field in `fields` must be present with a typed container containing:

- `rawText`
- `valueType`
- `valueText`
- `valueNumber`
- `valueDate`
- `valueBoolean`
- `valueCode`
- `parseStatus`
- `parseNotes`

## Review-State Contract

For user-visible review, every canonical field must resolve to one of these effective states:

- `parsed`
- `missing`
- `masked`
- `conflicting`
- `failed`
- `not-applicable`

The UI may derive these review states from the typed field container plus exceptions, but the distinction must be stable and testable.

## Evidence Contract

Evidence records must provide enough context for review:

- `fieldId`
- `status`
- `sourceType`
- `sourcePage`
- `sourceLabel`
- `excerpt`

## Exception Contract

Exception records must provide:

- `fieldId`
- `code`
- `message`
- `sourcePage`
- `sourceLabel`

Supported codes for this feature include at minimum:

- `missing`
- `masked-numeric-evidence`
- `parse-failed`
- `schedule-not-present`
- `conflict`
- `attachment-only`
- `unsupported-pattern`

## All Years Contract

Cross-year outputs must:

- include the expanded canonical field set
- use stable column order
- preserve deterministic year ordering
- preserve deterministic duplicate-year resolution
- preserve explicit unresolved states rather than collapsing them to blanks when state matters to review

## Corpus Validation Contract

Representative-corpus validation outputs must report:

- expected targeted fields
- matched targeted fields
- masked targeted fields
- conflicting targeted fields
- false positives
- unexpected populated fields
- coverage grouped by schedule family and source type
