const test = require("node:test");
const assert = require("node:assert/strict");

const core = require("../src/lib/core.js");
const historicalRegistry = require("../src/lib/schema/historical-registry.js");
const scheduleRouter = require("../src/lib/extraction/schedule-router.js");
const ocrPipeline = require("../src/lib/extraction/ocr-pipeline.js");

test("historical registry rewrites location references to the requested filing year", () => {
  const registry = historicalRegistry.getHistoricalSchemaRegistry(2013);
  const planName = registry.find((field) => field.fieldId === "planName");
  assert.equal(planName.locationRef.instructionsYear, 2013);
});

test("schedule router detects filing year and schedule markers", () => {
  const context = scheduleRouter.detectContext(
    "Annual Return/Report beginning 01/01/2018 and ending 12/31/2018\nSchedule H\nSchedule SB",
    "sample-2018.pdf"
  );

  assert.equal(context.filingYear, 2018);
  assert.deepEqual(context.schedules, ["H", "SB"]);
});

test("PDF-backed extraction maps common filing fields into typed containers", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2022 and ending 12/31/2022",
    "Name of plan",
    "ACME Salaried Employees Retirement Plan",
    "Plan number 001",
    "Employer identification number 12-3456789",
    "Name of plan sponsor",
    "ACME Holdings, Inc.",
    "Business code 541611",
    "Total number of participants 1,245",
    "Total assets 1,000,000 1,250,000",
    "Total liabilities 100,000 120,000",
    "Net assets 900,000 1,130,000",
    "Funding target attainment percentage 84.5%",
    "Schedule H",
    "Schedule SB"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000",
      ingestionTimestamp: "2026-03-31T00:00:00Z",
      fileName: "acme-2022.pdf"
    }
  );

  assert.equal(extracted.planName.valueText, "ACME Salaried Employees Retirement Plan");
  assert.equal(extracted.planNumber.valueCode, "001");
  assert.equal(extracted.sponsorEmployerIdentificationNumber.valueCode, "12-3456789");
  assert.equal(extracted.planYearBeginDate.valueDate, "2022-01-01");
  assert.equal(extracted.planYearEndDate.valueDate, "2022-12-31");
  assert.equal(extracted.fields.businessCode.valueCode, "541611");
  assert.equal(extracted.fields.participantCountTotal.valueNumber, "1245");
  assert.equal(extracted.fields.assetsEndOfYear.valueNumber, "1250000");
  assert.equal(extracted.fields.fundingTargetAttainmentPercent.valueNumber, "0.845");
});

test("all-years aggregation carries expanded schema fields into exported rows", () => {
  const extracted = core.buildExtractedFromPdfData(
    {
      documentText: [
        "Beginning 01/01/2021 and ending 12/31/2021",
        "Name of plan",
        "Northwind Pension Plan",
        "Plan number 010",
        "Employer identification number 98-7654321",
        "Total assets 500,000 700,000"
      ].join("\n"),
      pages: [],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-2000",
      ingestionTimestamp: "2026-03-31T00:00:00Z",
      fileName: "northwind-2021.pdf"
    }
  );

  const aggregate = core.aggregateAllYears([extracted], core.getDefaultSchemaRegistry());
  assert.equal(aggregate.rows.length, 1);
  assert.equal(aggregate.rows[0].assetsEndOfYear, "700000");
});

test("OCR fallback returns manual preconversion guidance in the single-file build", async () => {
  const result = await ocrPipeline.attemptOcrFallback({ documentText: "", pages: [] });
  assert.equal(result.status, "ocr-unavailable");
  assert.match(result.message, /text-searchable PDF/i);
});
