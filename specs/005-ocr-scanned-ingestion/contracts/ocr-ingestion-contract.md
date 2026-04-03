# Contract: OCR-Assisted Scanned Filing Ingestion

## Purpose

Define the observable behavior required when the app ingests a scanned or image-only standard Form 5500 PDF.

## Scope

- Standard Form 5500 only
- Scanned or image-only PDFs
- Browser-local OCR fallback
- Existing typed extraction pipeline and queue review flow

## Behavioral Contract

1. When a PDF lacks usable embedded text, the app attempts OCR locally before directing the user to manual remediation.
2. OCR-recovered text is fed into the existing typed extraction workflow rather than a parallel export-only path.
3. OCR-assisted filings preserve the existing typed-field container structure and duplicate-year behavior.
4. The queue must expose whether OCR succeeded, whether manual review is still required, and any OCR confidence hint that is available.
5. OCR failure does not discard the filing. The filing remains in the workflow with an explicit incomplete/review-needed state.
6. Mixed filings must prefer native text when available and use OCR only for pages lacking readable text.
7. Runtime OCR must not depend on external network fetches for worker code, core code, or language data.

## Validation Expectations

- A legible scanned filing should progress through OCR into a normal extracted record.
- A partially legible filing may produce a mixed result with unresolved field exceptions and explicit review messaging.
- An unreadable filing remains queued with manual-remediation guidance instead of silent failure.
