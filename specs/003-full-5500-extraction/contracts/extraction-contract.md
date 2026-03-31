# Extraction Contract: Full 5500 Extraction

## Input Contract

- Input is a locally ingested standard Form 5500 PDF package.
- Input may contain:
  - native text
  - image-only pages
  - mixed native and image pages
  - any schedule type present in a standard Form 5500 filing package

## Processing Contract

- Determine filing year and applicable instructions year before field mapping.
- Extract native text first.
- Trigger OCR only when native text is insufficient for the page or field region.
- Never fabricate values; unresolved fields remain failed or missing with notes.

## Output Contract

Each filing yields one filing-year extraction record containing:

- mandatory filing identifiers
- all schema-governed field values
- field-level location references
- field evidence
- extraction exceptions
- parsed-field metrics

## Exception Contract

- `schedule-not-present`: schedule absent, fields not applicable
- `missing-text`: native text absent and OCR not attempted
- `ocr-insufficient`: OCR attempted but not reliable enough
- `ambiguous-match`: candidate values conflict
- `parse-failed`: raw evidence found but typed normalization failed
- `unsupported-family`: filing is not a standard Form 5500 family member

## Remediation Contract

- When OCR is insufficient, the UI must direct the user to provide a
  text-searchable PDF and re-ingest the filing.
- Exception reporting must preserve enough field and page context for manual review.
