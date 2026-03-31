# Research: Ingestion Local, Remote, and EFAST CSV

## Decision: Use a zero-dependency custom build pipeline

**Rationale**: The repository starts empty, the release artifact must be exactly
one HTML file, and Node built-ins are enough to inline template, CSS, and JS.

**Alternatives considered**:

- Use Vite or another bundler: rejected because it adds setup weight and may
  emit extra assets without additional configuration.
- Hand-maintain one HTML file without source files: rejected because it makes
  testing and iteration harder.

## Decision: Reuse one download engine for pasted URLs and CSV-derived URLs

**Rationale**: Shared fetch, abort, validation, and error-classification logic
keeps queue behavior consistent and reduces state divergence.

**Alternatives considered**:

- Separate handlers for pasted URLs and CSV URLs: rejected because it duplicates
  concurrency, retry, and validation logic.

## Decision: Parse EFAST CSV with a resilient header normalizer

**Rationale**: CSV exports commonly vary by spacing, punctuation, and casing.
Normalizing headers avoids fragile exact-string mapping.

**Alternatives considered**:

- Require exact EFAST header text: rejected because it would fail on minor
  variants and exported column naming differences.
