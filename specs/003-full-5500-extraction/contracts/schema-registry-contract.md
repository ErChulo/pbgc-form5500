# Schema Registry Contract: Full 5500 Extraction

## Registry Authority

- The schema registry remains the single authority for:
  - canonical field identifiers
  - exported column order
  - header labels
  - data types
  - location references
  - year-aware instructions mappings

## Historical Coverage

- Registry entries must exist for every historical standard Form 5500 year
  supported by the feature.
- Each entry must identify:
  - `instructionsYear`
  - `form`
  - `schedule`
  - `part`
  - `line`

## Applicability Rules

- A field may be:
  - always applicable
  - applicable only when a schedule is attached
  - applicable only in specific historical years

## Export Rules

- Export columns derive from registry entries marked `exportGroup = "allYears"`.
- Stable ordering derives from `exportOrder`.
- Missing or not-applicable values do not remove columns from the all-years export.
