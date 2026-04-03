# Research: OCR Scanned Filing Ingestion

## Decision 1: Keep OCR as a fallback into the existing typed extraction pipeline

**Decision**: OCR output should be converted back into plain filing text and sent through the same `buildExtractedFromPdfData -> mapDocumentFields -> normalizeFieldValue` path used for native-text PDFs.

**Rationale**: This preserves one canonical extraction model, one typed-field contract, and one duplicate-year aggregation path. It also keeps OCR-specific risk isolated to text recovery rather than field normalization.

**Alternatives considered**:
- Build a separate OCR-only field parser: rejected because it would fork validation and export behavior.
- Store OCR output only as raw review text: rejected because the feature promise is direct ingestion into the normal workflow.

## Decision 2: Embed OCR assets and seed language data locally

**Decision**: The single-file build should inline `tesseract.js`, the worker bundle, a fixed core bundle, and a vendored `eng.traineddata.gz`, then seed the language data into the browser cache before creating workers.

**Rationale**: The feature must stay offline and self-contained. `tesseract.js` normally expects to download language data and core assets from a CDN, so embedding and local seeding are required to satisfy the product constraints.

**Alternatives considered**:
- Allow runtime CDN fetches for OCR assets: rejected because it breaks single-file offline behavior and privacy expectations.
- Require users to install language assets manually: rejected because it adds operational friction and undermines the app’s portability.

## Decision 3: Rasterize only pages that lack readable native text

**Decision**: Use `pdf.js` page rendering only for pages whose extracted text layer is empty, and pass those page images to OCR.

**Rationale**: Mixed-quality filings can contain both native text and scanned pages. Limiting OCR to textless pages avoids duplicate text, reduces OCR runtime, and keeps the best available evidence.

**Alternatives considered**:
- OCR every page unconditionally: rejected because it is slower and risks conflicting with already-correct native text.
- Refuse mixed filings and require manual pre-processing: rejected because mixed filings are explicitly called out in the spec’s edge cases.

## Decision 4: Expose OCR confidence as review guidance, not proof of correctness

**Decision**: Surface filing-level OCR confidence and preserve unresolved-field review states, but continue to rely on existing field-level parse statuses and exception handling for downstream trust decisions.

**Rationale**: OCR confidence alone does not prove a field was mapped correctly. It is useful as operator context, but it should not replace typed extraction status.

**Alternatives considered**:
- Treat high OCR confidence as automatic field success: rejected because it would overstate extraction certainty.
- Hide OCR confidence entirely: rejected because users need a clear signal that they are reviewing OCR-assisted output.
