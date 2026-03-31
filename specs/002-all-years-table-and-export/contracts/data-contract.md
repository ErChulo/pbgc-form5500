# Data Contract: All Years Table and Export

## Mandatory Columns

1. `planName`
2. `planNumber`
3. `sponsorEmployerIdentificationNumber`
4. `planYearBeginDate`
5. `planYearEndDate`
6. `filingKind`
7. `receivedTimestamp`
8. `extractionQuality`

## CSV Rules

- Header row included.
- Quote any field containing comma, quote, or newline.
- Escape quotes by doubling them.
- Use LF line endings.
- Export only the visible columns in on-screen order.

## Filename Rules

- Base prefix: `form5500-all-years`
- Optional ordered segments:
  - `planNumber`
  - `sponsorEmployerIdentificationNumber`
  - minimum plan year end year
  - maximum plan year end year when different
- Always append `v0.7.0`
