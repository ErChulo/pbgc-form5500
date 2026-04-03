# Quickstart: Numeric Schedule Validation Completion

## Goal

Verify that participant-count and schedule-number extraction is correct for readable standard Form 5500 filings with real populated numeric values, while keeping masked or stand-in numeric filings explicit and non-misleading.

## Prerequisites

- Branch: `004-numeric-schedule-validation`
- Local fixture or validation corpus of readable standard Form 5500 PDFs
- At least one filing with real participant counts
- At least one filing with real Schedule H or Schedule I values
- At least one filing with real Schedule SB percentage values if Schedule SB remains in scope for the corpus

## Automated Verification

1. Run `npm test`
2. Run `npm run build`
3. Confirm `/dist` contains exactly `form5500-ingestor-v0.7.0.html`

## Manual Validation Flow

1. Open the built HTML artifact in a browser.
2. Ingest a readable filing with real participant counts and confirm the participant fields are parsed with correct typed values.
3. Ingest a readable filing with real Schedule H or Schedule I numeric values and confirm the extracted fields come from the expected row-coded evidence.
4. Ingest a filing containing masked or stand-in numeric content and confirm the app does not present those numeric fields as validated successes.
5. Review the filing-level extraction metrics and exceptions to confirm masked, unresolved, and schedule-absent cases remain distinct.
6. Open All years and verify the expanded numeric fields still align under stable columns and deterministic duplicate-year selection.

## Completion Check

The feature is ready only when:
- targeted participant and schedule numeric fields meet the agreed corpus accuracy threshold
- masked numeric content is not counted as successful extraction
- repeated runs of the same corpus produce the same numeric statuses and results
- automated tests cover the discovered regression patterns

## Current Residual Gaps

- The uploaded public-style fixtures in `tests/fixtures/feature-003/` still contain masked or stand-in participant and Schedule H values in the critical numeric rows, so they do not prove full numeric extraction completion.
- The scanned `FORM 5500 - 2015.pdf` remains a valid OCR/manual-remediation test case, but it does not contribute to text-native numeric completion for this feature.
- The branch now distinguishes real numeric evidence from masked evidence, but final sign-off still requires at least one representative text-searchable filing with genuinely populated participant and schedule numbers.
