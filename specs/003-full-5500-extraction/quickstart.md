# Quickstart: Full 5500 Extraction

## Build

1. Run `npm test`
2. Run `npm run build`
3. Confirm `/dist/form5500-ingestor-v0.7.0.html` is the only file in `/dist`

## Manual Checks

1. Ingest one text-native standard Form 5500 PDF with at least one attached schedule.
2. Confirm the filing-year record populates values beyond the current stub identifiers and dates.
3. Open the All years tab and verify the expanded exported field set appears in stable order.
4. Ingest a duplicate filing year and confirm the preferred filing rule still selects one deterministic row.
5. Ingest one image-only or degraded filing.
6. Confirm OCR is attempted and unresolved fields remain visible with exception notes if OCR is insufficient.
7. Confirm the UI directs the user to provide a text-searchable PDF when OCR is insufficient.
8. Export CSV and verify the file contains the expanded schema-driven field set.
