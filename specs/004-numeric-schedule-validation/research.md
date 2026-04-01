# Research: Numeric Schedule Validation Completion

## Decision 1: Keep the existing typed-field pipeline as the only extraction model

**Decision**: Extend the current `buildExtractedFromPdfData -> mapDocumentFields -> normalizeFieldValue` pipeline rather than adding a second numeric-validation data path.

**Rationale**: The existing pipeline already produces the required typed containers, evidence arrays, exceptions, and aggregate metrics. Reusing it preserves deterministic export behavior and avoids parallel field representations that would drift.

**Alternatives considered**:
- Build a separate corpus-analysis layer outside the extraction pipeline: rejected because it would duplicate normalization and status rules.
- Add ad hoc validation flags only in tests: rejected because users also need visibility into numeric sufficiency and unresolved numeric fields.

## Decision 2: Treat masked or stand-in numeric content as a first-class sufficiency state

**Decision**: Add explicit numeric-sufficiency handling for participant and schedule numeric fields when evidence contains stand-in patterns rather than real populated values.

**Rationale**: Public and redacted filings can be structurally real while still containing non-usable numeric values. The feature needs to separate "field missing because the filing is masked" from "field failed because extraction was wrong."

**Alternatives considered**:
- Parse any number-shaped text and rely on reviewers to infer masking: rejected because it would overstate extraction success.
- Drop masked filings entirely: rejected because they still provide structural validation value and should remain usable for non-numeric checks.

## Decision 3: Favor row-coded, page-local numeric matching over generic global number scans

**Decision**: Numeric extraction improvements should rely on row-coded schedule and participant matching tied to canonical line patterns instead of broad global scans.

**Rationale**: Existing failures came from page-wide text blobs, tables of contents, and auditor attachments being mistaken for values. Row-local matching is safer and more deterministic for the remaining numeric fields.

**Alternatives considered**:
- Broaden regex scans over the full joined document text: rejected because it repeats the false-positive problem already observed.
- Depend on OCR-like fuzzy matching even for text-native filings: rejected because this feature is limited to readable text-searchable filings.

## Decision 4: Use a representative local validation corpus plus regression fixtures

**Decision**: Validate the feature with a small representative corpus of real populated filings and codify the resulting edge cases in automated tests.

**Rationale**: The completion claim depends on corpus-backed evidence, but long-term protection comes from deterministic local tests capturing the discovered patterns.

**Alternatives considered**:
- Validate only with one-off manual checks: rejected because it is not repeatable.
- Validate only with synthetic fixtures: rejected because the numeric gap exists specifically on real filing layouts and evidence shapes.
