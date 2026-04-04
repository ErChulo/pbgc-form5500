# Quickstart: Full Filing Package Extraction

## Goal

Validate and iterate on materially complete extraction from text-searchable full Form 5500 filing packages before enabling scanned/OCR support.

## Prerequisites

- Representative text-searchable full Form 5500 filing packages with known-good expected values
- Coverage across the main form, schedules, and attachments
- At least one multi-year plan corpus with duplicate or amended filings

## Current Representative Corpus Scaffold

- Fixture manifest: [`tests/fixtures/feature-006/manifest.json`](/workspaces/pbgc-form5500/tests/fixtures/feature-006/manifest.json)
- Expected values: [`tests/fixtures/feature-006/expected-values.json`](/workspaces/pbgc-form5500/tests/fixtures/feature-006/expected-values.json)
- Current seeded filings:
  - `college-st-rose-2021-pension`
  - `college-st-rose-2021-403b`
  - `college-st-rose-2024-pension`
  - `college-st-rose-2015-scanned`

## Workflow

1. Switch to branch `006-full-filing-extraction`.
2. Review [`spec.md`](/workspaces/pbgc-form5500/specs/006-full-filing-extraction/spec.md), [`plan.md`](/workspaces/pbgc-form5500/specs/006-full-filing-extraction/plan.md), and [`research.md`](/workspaces/pbgc-form5500/specs/006-full-filing-extraction/research.md).
3. Add representative validation fixtures and expected-value assertions for:
   - main-form fields
   - schedule-bound fields
   - attachment-derived fields
   - conflicting and masked cases
4. Expand the canonical schema registry to the agreed full field set.
5. Implement schedule-family extractors and attachment-family extractors.
6. Extend evidence and exception handling so every unresolved field remains reviewable.
7. Update the single-filing review UI and All years outputs for the expanded field set.
8. Run:

```bash
npm test
npm run build
```

9. Open the built [`dist/form5500-ingestor-v0.7.0.html`](/workspaces/pbgc-form5500/dist/form5500-ingestor-v0.7.0.html) and validate:
   - one filing with multiple schedules
   - one filing where attachment values override missing schedule-body values
   - one filing with masked or placeholder numeric values
   - one duplicate-year scenario
10. Compare extracted output against the expected-value corpus and record coverage gaps before additional parser changes.

## Exit Criteria For This Feature

- Expanded canonical schema is implemented
- Full filing review UI works with the expanded field set
- All years export works with the expanded field set
- Representative-corpus validation meets the success criteria in the spec
- Remaining OCR work is isolated as a later compatible phase, not a blocker for text-searchable completion
