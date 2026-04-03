# Quickstart: OCR Scanned Filing Ingestion

## Goal

Verify that scanned or image-only standard Form 5500 PDFs can be ingested without external pre-conversion and that the result stays in the normal review workflow.

## Prerequisites

- Install dependencies with `npm install`
- Use a modern desktop browser
- Have at least one scanned or image-only standard Form 5500 PDF available

## Build and Verify

1. Run `npm test`
2. Run `npm run build`
3. Open [`dist/form5500-ingestor-v0.7.0.html`](/workspaces/pbgc-form5500/dist/form5500-ingestor-v0.7.0.html)

## Manual OCR Validation

1. Ingest a scanned or image-only standard Form 5500 PDF
2. Confirm the queue shows OCR progress rather than immediate pre-conversion guidance
3. Confirm the filing remains in the queue after OCR completes
4. Verify one of these outcomes:
   - `ready` or `ready-with-exceptions` with an OCR completion message and extracted fields
   - `ocr-manual-review` with explicit guidance when OCR could not recover enough text
5. Switch to the All years tab and confirm OCR-derived filings still participate in normal aggregation/export behavior

## Regression Focus

- OCR remains offline in the single-file build
- OCR does not replace native text on mixed filings
- OCR failures remain explicit and non-destructive
