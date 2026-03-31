# Research: Full 5500 Extraction

## Decision: Use `pdf.js` as the primary PDF parsing and rendering layer

**Rationale**: The official `pdf.js` documentation describes a browser-focused
display layer for rendering PDFs and getting document information, which fits
the project’s local-browser extraction model. It also provides a stable,
browser-oriented PDF foundation without requiring a backend.

**Alternatives considered**:

- Browser-native PDF handling only: rejected because extraction needs direct
  programmatic access to page text and rendered page images.
- Direct use of `pdf.js` core internals: rejected because the official docs
  describe the display layer as the stable API surface, while core APIs are more
  advanced and more likely to change.

Source:
- PDF.js Getting Started: https://mozilla.github.io/pdf.js/getting_started/?lang=en
- PDF.js GitHub repository: https://github.com/mozilla/pdf.js

## Decision: Use `tesseract.js` as OCR fallback on rasterized page images

**Rationale**: The official `tesseract.js` documentation supports browser OCR
through workers and WebAssembly, which matches the local-browser requirement.
Its documented scope is OCR on images rather than native PDF parsing, so the
correct architecture is to rasterize PDF pages first and then OCR only when
embedded text is insufficient.

**Alternatives considered**:

- No OCR fallback: rejected because the clarified spec requires OCR for image-only
  or degraded filings.
- Direct PDF OCR through `tesseract.js`: rejected because the official project
  scope states that it does not support PDF files directly.

Source:
- Tesseract.js GitHub repository: https://github.com/naptha/tesseract.js

## Decision: Do not use `scribe.js` as the primary extraction stack

**Rationale**: `scribe.js` officially supports text extraction from PDFs and OCR
for image-native PDFs, so it is a technically relevant alternative. However, its
AGPL-3.0 license materially changes the repository’s distribution/compliance
posture and therefore raises a product/legal tradeoff that is avoidable with a
`pdf.js` plus OCR composition.

**Alternatives considered**:

- Adopt `scribe.js` end to end: rejected for the initial plan because of AGPL
  licensing implications and tighter coupling to a larger extraction stack than
  the current app needs.

Source:
- Scribe.js GitHub repository: https://github.com/scribeocr/scribe.js

## Decision: Model historical year variation in the schema registry, not in ad hoc parser branches

**Rationale**: The clarified feature scope covers every historical standard Form
5500 year and every schedule type. A year-aware schema registry keeps location
references, exported columns, and field normalization centralized while allowing
the extraction layer to route by filing year and schedule type.

**Alternatives considered**:

- Per-year hardcoded parser branches only: rejected because they would make the
  extraction surface harder to validate and keep consistent with export order.
- One year-agnostic schema: rejected because historical wording and layout drift
  would force ambiguous mappings and reduce determinism.
