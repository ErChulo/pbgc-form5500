# Data Model: Numeric Schedule Validation Completion

## Entity: Numeric Validation Corpus

**Purpose**: Represents the set of filings used to prove completion of the remaining numeric extraction scope.

**Fields**:
- `corpusId`: Stable identifier for the corpus run
- `filings`: Ordered list of corpus filing entries
- `coverageNotes`: Human-readable summary of included years, schedules, and numeric field groups
- `runTimestamp`: Timestamp for the validation pass

**Validation Rules**:
- Must contain only standard Form 5500 filings
- Must distinguish readable populated filings from structurally useful but numerically insufficient filings
- Ordering must be stable across repeated runs with the same input set

## Entity: Corpus Filing Entry

**Purpose**: Describes one filing’s eligibility to count toward numeric extraction validation.

**Fields**:
- `fileName`: User-visible filing identifier
- `filingYear`: Instructions year inferred for schema selection
- `detectedSchedules`: Attached schedules found in the filing
- `textSource`: Native-text status for the filing
- `numericSufficiency`: Classification of `sufficient`, `partial`, or `insufficient`
- `insufficiencyReasons`: List of reasons the filing cannot fully prove numeric extraction

**Validation Rules**:
- `numericSufficiency` must be derived from field-level evidence, not from filename heuristics alone
- A filing with stand-in numeric content may still be retained but cannot count as fully sufficient

## Entity: Numeric Extraction Result

**Purpose**: Represents the typed outcome for one participant-count or schedule-number field.

**Fields**:
- `fieldId`: Canonical field identifier from the schema registry
- `rawText`: Extracted source text before normalization
- `normalizedValue`: Parsed number or percent fraction when available
- `parseStatus`: `parsed`, `missing`, or `failed`
- `sourceLabel`: Row or line reference used to extract the value
- `sourcePage`: Page number when available
- `sufficiencyStatus`: `validated`, `masked`, `unresolved`, or `not-applicable`

**Validation Rules**:
- `normalizedValue` may only exist when `parseStatus` is `parsed`
- `sufficiencyStatus = masked` requires evidence of stand-in or redacted content
- `not-applicable` is reserved for schedule-absence cases, not extraction failure

## Entity: Numeric Sufficiency Assessment

**Purpose**: Summarizes whether a filing provided enough real numeric evidence to support completion claims.

**Fields**:
- `filingId`: Associated ingest or corpus identifier
- `validatedFieldCount`: Count of numeric fields backed by real populated evidence
- `maskedFieldCount`: Count of numeric fields blocked by stand-in content
- `failedFieldCount`: Count of numeric fields where extraction appears wrong despite available evidence
- `notes`: Reviewer-facing explanation for mixed or insufficient cases

**State Transitions**:
- `unreviewed -> sufficient` when targeted numeric fields are backed by real populated values
- `unreviewed -> partial` when some targeted fields are real and others are masked or missing
- `unreviewed -> insufficient` when the filing cannot support numeric completion claims

**Relationships**:
- A `Numeric Validation Corpus` contains many `Corpus Filing Entry` records
- Each `Corpus Filing Entry` produces many `Numeric Extraction Result` records
- Each `Corpus Filing Entry` has one `Numeric Sufficiency Assessment`
