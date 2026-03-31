# Quickstart: All Years Table and Export

## Manual Checks

1. Build the application with `npm run build`.
2. Ingest at least one local PDF whose filename includes a year and one EFAST CSV row with explicit metadata.
3. Open the All years tab and verify mandatory columns render first.
4. Confirm rows sort by `planYearEndDate` then `planYearBeginDate`.
5. Add duplicate plan-year data and verify the preferred record follows the duplicate rule.
6. Toggle any optional columns and verify the table updates.
7. Download CSV and confirm the header order matches the visible table.
8. Copy CSV to clipboard and verify the pasted result matches the visible table.
