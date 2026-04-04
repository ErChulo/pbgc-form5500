# Research: Full Filing Package Extraction

## Decision 1: Keep One Canonical Field Model Across Main Form, Schedules, And Attachments

- **Decision**: Use one canonical field catalog that represents all extractable plan attributes, regardless of whether a value originates from the main form, a schedule, or an attachment.
- **Rationale**: Users want one complete filing record and one cross-year export model. A source-agnostic field catalog allows stable identifiers, stable exports, and consistent review states.
- **Alternatives considered**:
  - Separate field catalogs per schedule: rejected because it would fragment the user-visible record and complicate exports.
  - Attachment-only ad hoc fields: rejected because it would break determinism and make later validation inconsistent.

## Decision 2: Preserve Typed Field Containers For Every Canonical Field

- **Decision**: Every field continues to use the existing typed container model with raw text, normalized typed value, parse status, and parse notes.
- **Rationale**: The constitution requires typed containers and deterministic output. The full-extraction feature expands the field universe but should not change the contract shape.
- **Alternatives considered**:
  - Return plain strings for attachment-derived values: rejected because it would weaken validation and export determinism.
  - Use schedule-specific result shapes: rejected because it would complicate UI review and cross-year exports.

## Decision 3: Use Source-Aware Evidence And Exception Records

- **Decision**: Preserve and expand field evidence and exception metadata so every canonical field can be traced to its source section, source page, and source type.
- **Rationale**: Full extraction is only operationally useful if users can audit where values came from and why unresolved fields remain unresolved.
- **Alternatives considered**:
  - Keep only parse status without source evidence: rejected because users would not be able to trust attachment-derived or conflict-resolved values.
  - Show only filing-level warnings: rejected because per-field review is necessary for completion and validation.

## Decision 4: Add Schedule-Specific Extractors Rather Than One Giant Generic Parser

- **Decision**: Build focused extractors for each schedule family and attachment family while routing them into one canonical record assembly layer.
- **Rationale**: Form 5500 schedules differ materially in layout, row semantics, and attachment behavior. Localized extractors are easier to validate and less fragile than one generic matcher.
- **Alternatives considered**:
  - A single document-wide regex layer: rejected because the current work already demonstrated false positives and poor field coverage.
  - External ML or document AI service: rejected because it violates the local-only privacy and delivery constraints.

## Decision 5: Treat Attachments As First-Class Value Sources

- **Decision**: Audited financial statements, actuarial narratives, and other qualifying attachments are considered first-class sources when they contain the only trustworthy value for a canonical field.
- **Rationale**: Many real filings place meaningful values in audited statements or supplemental attachments rather than in clean schedule rows.
- **Alternatives considered**:
  - Ignore attachments entirely: rejected because it prevents materially complete extraction.
  - Always prefer attachments over schedules: rejected because attachment and schedule values can conflict and must be reviewed deterministically.

## Decision 6: Explicitly Model Conflicts And Masked Values

- **Decision**: Full extraction must distinguish parsed, missing, masked, conflicting, failed, and not-applicable states and must not silently choose a value when the filing contains ambiguous competing values.
- **Rationale**: Real filing packages include placeholders, redactions, duplicate values, and conflicting statements. Hiding those conditions would make the output look more complete than it really is.
- **Alternatives considered**:
  - Treat placeholder-like numbers as valid if they parse: rejected because it produces false confidence.
  - Auto-pick one conflicting value without surfacing the conflict: rejected because it weakens auditability.

## Decision 7: Use Representative Corpus Validation As A Release Gate

- **Decision**: Completion for this feature depends on a representative corpus with known-good expected values covering full filings, schedules, and attachments.
- **Rationale**: This feature is too broad to validate by unit tests alone. Corpus-driven validation is necessary to measure coverage and false positives honestly.
- **Alternatives considered**:
  - Rely only on synthetic unit tests: rejected because that approach already overstated practical completeness.
  - Use public placeholder-filled filings as the sole corpus: rejected because they cannot validate many numeric fields.

## Decision 8: Keep OCR Out Of Phase 1 Execution

- **Decision**: The plan for this feature preserves OCR as a compatible later phase rather than a prerequisite for full text-searchable extraction.
- **Rationale**: The user’s requested end state includes scanned filings, but mixing OCR delivery into this plan would slow the immediate goal of completing text-searchable full extraction.
- **Alternatives considered**:
  - Fold OCR into the first implementation phase: rejected because it widens the scope too aggressively.
  - Ignore OCR entirely: rejected because the canonical contracts should remain compatible with later OCR support.
