# Research: All Years Table and Export

## Decision: Represent typed extraction with a single reusable FieldValue shape

**Rationale**: A single container shape keeps stubbed extraction and future real
scraping consistent while making unit testing straightforward.

**Alternatives considered**:

- Ad hoc values per field: rejected because it would make parse status and
  export normalization inconsistent.

## Decision: Use pure functions for aggregation and CSV generation

**Rationale**: Pure logic is easier to test, keeps deterministic behavior
obvious, and reduces coupling between view code and export code.

**Alternatives considered**:

- Build rows directly in DOM code: rejected because it would make testing and
  duplicate selection logic harder to validate.

## Decision: Keep one optional schema-registry export column in v0.7.0

**Rationale**: The app needs to prove the schema-driven export path now without
pretending full PDF scraping already exists.

**Alternatives considered**:

- No optional columns at all: rejected because it would under-exercise the
  schema registry and column chooser behaviors.
