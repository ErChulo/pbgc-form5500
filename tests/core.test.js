const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/lib/core.js");

test("CSV quoting escapes commas, quotes, and newlines", () => {
  const csv = core.toCsv(
    [{ key: "name", label: "name" }, { key: "notes", label: "notes" }],
    [{ name: 'ACME "Plan"', notes: "line 1,\nline 2" }]
  );

  assert.equal(csv, 'name,notes\n"ACME ""Plan""","line 1,\nline 2"');
});

test("preferred filing selection favors latest received timestamp, then filing kind, then ingestion timestamp", () => {
  const olderReceived = core.buildExtractedFromCsvRow(
    {
      planName: "Plan A",
      planNumber: "001",
      sponsorEmployerIdentificationNumber: "111111111",
      planYearBeginDate: "2023-01-01",
      planYearEndDate: "2023-12-31",
      filingKind: "original",
      receivedTimestamp: "2024-02-01T00:00:00Z"
    },
    { ingestId: "ing-1", ingestionTimestamp: "2024-02-01T00:00:00Z" }
  );

  const newerReceived = core.buildExtractedFromCsvRow(
    {
      planName: "Plan A",
      planNumber: "001",
      sponsorEmployerIdentificationNumber: "111111111",
      planYearBeginDate: "2023-01-01",
      planYearEndDate: "2023-12-31",
      filingKind: "original",
      receivedTimestamp: "2024-03-01T00:00:00Z"
    },
    { ingestId: "ing-2", ingestionTimestamp: "2024-01-01T00:00:00Z" }
  );

  const aggregate = core.aggregateAllYears([olderReceived, newerReceived], core.getDefaultSchemaRegistry());
  assert.equal(aggregate.rows.length, 1);
  assert.equal(aggregate.rows[0].receivedTimestamp, "2024-03-01T00:00:00Z");
});

test("FieldValue normalization handles integer, currency, percent, and date", () => {
  assert.equal(core.normalizeFieldValue("1,250", "integer").valueNumber, "1250");
  assert.equal(core.normalizeFieldValue("(1,250.50)", "currency").valueNumber, "-1250.5");
  assert.equal(core.normalizeFieldValue("84.5%", "percent").valueNumber, "0.845");
  assert.equal(core.normalizeFieldValue("3/31/2026", "date").valueDate, "2026-03-31");
});

test("EFAST CSV ingestion tolerates header variants and extracts a PDF URL when present", () => {
  const csvText = [
    "Plan Name,Plan Number,Sponsor EIN,Plan Year End Date,Filing PDF URL",
    'Alpha Plan,007,123456789,2024-12-31,https://example.com/forms/alpha.pdf'
  ].join("\n");

  const result = core.ingestEfastCsv(csvText, { sourceName: "efast.csv" });
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].metadata.planName, "Alpha Plan");
  assert.equal(result.records[0].metadata.planNumber, "007");
  assert.equal(result.records[0].metadata.sponsorEmployerIdentificationNumber, "123456789");
  assert.equal(result.records[0].remoteUrl, "https://example.com/forms/alpha.pdf");
});

test("EFAST CSV ingestion keeps detail-page links metadata-only when no direct PDF URL exists", () => {
  const csvText = [
    "Plan Name,Plan Number,Sponsor EIN,Detail URL",
    'Beta Plan,008,987654321,https://example.com/filing/detail?id=42'
  ].join("\n");

  const result = core.ingestEfastCsv(csvText, { sourceName: "efast.csv" });
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].remoteUrl, null);
  assert.equal(result.records[0].metadata.detailUrl, "https://example.com/filing/detail?id=42");
});

test("validation corpus summary is deterministic across mixed filing sufficiency states", () => {
  const sufficient = core.buildExtractedFromCsvRow(
    {
      planName: "Plan A",
      planNumber: "001",
      sponsorEmployerIdentificationNumber: "111111111",
      planYearBeginDate: "2023-01-01",
      planYearEndDate: "2023-12-31"
    },
    { ingestId: "ing-1", ingestionTimestamp: "2024-02-01T00:00:00Z" }
  );
  sufficient.metrics = {
    ...sufficient.metrics,
    filingNumericSufficiency: "sufficient",
    validatedNumericFieldCount: 8,
    targetedNumericFieldCount: 8,
    maskedNumericFieldCount: 0,
    failedNumericFieldCount: 0,
    unresolvedNumericFieldCount: 0,
    notApplicableNumericFieldCount: 0
  };

  const partial = core.buildExtractedFromCsvRow(
    {
      planName: "Plan B",
      planNumber: "002",
      sponsorEmployerIdentificationNumber: "222222222",
      planYearBeginDate: "2022-01-01",
      planYearEndDate: "2022-12-31"
    },
    { ingestId: "ing-2", ingestionTimestamp: "2024-02-01T00:00:00Z" }
  );
  partial.metrics = {
    ...partial.metrics,
    filingNumericSufficiency: "partial",
    validatedNumericFieldCount: 5,
    targetedNumericFieldCount: 8,
    maskedNumericFieldCount: 2,
    failedNumericFieldCount: 0,
    unresolvedNumericFieldCount: 1,
    notApplicableNumericFieldCount: 0
  };

  const insufficient = core.buildExtractedFromCsvRow(
    {
      planName: "Plan C",
      planNumber: "003",
      sponsorEmployerIdentificationNumber: "333333333",
      planYearBeginDate: "2021-01-01",
      planYearEndDate: "2021-12-31"
    },
    { ingestId: "ing-3", ingestionTimestamp: "2024-02-01T00:00:00Z" }
  );
  insufficient.metrics = {
    ...insufficient.metrics,
    filingNumericSufficiency: "insufficient",
    validatedNumericFieldCount: 0,
    targetedNumericFieldCount: 8,
    maskedNumericFieldCount: 3,
    failedNumericFieldCount: 1,
    unresolvedNumericFieldCount: 4,
    notApplicableNumericFieldCount: 0
  };

  const summary = core.summarizeValidationCorpus([partial, sufficient, insufficient]);
  assert.deepEqual(summary, {
    filingCount: 3,
    sufficientFilingCount: 1,
    partialFilingCount: 1,
    insufficientFilingCount: 1,
    validatedNumericFieldCount: 13,
    targetedNumericFieldCount: 24,
    maskedNumericFieldCount: 5,
    failedNumericFieldCount: 1,
    unresolvedNumericFieldCount: 5,
    notApplicableNumericFieldCount: 0
  });
});
