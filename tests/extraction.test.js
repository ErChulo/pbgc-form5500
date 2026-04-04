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
    "1f Total assets (add all amounts in lines 1a through 1e) 1f 1,000,000 1,250,000",
    "1k Total liabilities (add all amounts in lines 1g through 1j) 1k 100,000 120,000",
    "1l Net assets (subtract line 1k from line 1f) 1l 900,000 1,130,000",
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

test("summary footer and trailing line codes are preferred for real filing text", () => {
  const documentText = [
    "Form 5500 (2024) v. 240311 07/01/2024 04/20/2025 X X X X THE COLLEGE OF SAINT ROSE NON-CONTRACT EMPLOYEES' PENSION PLAN 001 07/01/1973 14-1338371 THE COLLEGE OF SAINT ROSE 518-925-1915 432 WESTERN AVENUE ALBANY, NY 12203 611000 Filed with authorized/valid electronic signature.",
    "5 Total number of participants at the beginning of the plan year 5 174",
    "b Retired or separated participants receiving benefits 6b 10",
    "c Other retired or separated participants entitled to future benefits 6c 0",
    "e Deceased participants whose beneficiaries are receiving or are entitled to receive benefits 6e 0",
    "f Total. Add lines 6d and 6e . 6f 10"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000b",
      ingestionTimestamp: "2026-03-31T00:00:00Z",
      fileName: "college-2024.pdf"
    }
  );

  assert.equal(extracted.planName.valueText, "THE COLLEGE OF SAINT ROSE NON-CONTRACT EMPLOYEES' PENSION PLAN");
  assert.equal(extracted.planNumber.valueCode, "001");
  assert.equal(extracted.sponsorEmployerIdentificationNumber.valueCode, "14-1338371");
  assert.equal(extracted.fields.businessCode.valueCode, "611000");
  assert.equal(extracted.fields.participantCountBeginningOfYear.valueNumber, "174");
  assert.equal(extracted.fields.retiredParticipantsReceivingBenefits.valueNumber, "10");
  assert.equal(extracted.fields.participantCountTotal.valueNumber, "10");
});

test("schedule h row-coded values are preferred over table-of-contents noise", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 07/01/2021 and ending 06/30/2022",
    "Name of plan",
    "Northwind Pension Plan",
    "Plan number 010",
    "Employer identification number 98-7654321",
    "THE COLLEGE OF SAINT ROSE NON-CONTRACT EMPLOYEES' PENSION PLAN TABLE OF CONTENTS Page Independent Auditor's Report 1 Financial Statements Statements of Net Assets Available for Plan Benefits 5 Statements of Changes in Net Assets Available for Plan Benefits 6",
    "Schedule H",
    "1f Total assets (add all amounts in lines 1a through 1e) 1f 1,000,000 1,250,000",
    "1k Total liabilities (add all amounts in lines 1g through 1j) 1k 100,000 120,000",
    "1l Net assets (subtract line 1k from line 1f) 1l 900,000 1,130,000"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000c",
      ingestionTimestamp: "2026-03-31T00:00:00Z",
      fileName: "northwind-2022.pdf"
    }
  );

  assert.equal(extracted.fields.assetsBeginningOfYear.valueNumber, "1000000");
  assert.equal(extracted.fields.assetsEndOfYear.valueNumber, "1250000");
  assert.equal(extracted.fields.netAssetsBeginningOfYear.valueNumber, "900000");
  assert.equal(extracted.fields.netAssetsEndOfYear.valueNumber, "1130000");
});

test("schedule numeric rows parse when the label precedes the line code", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2022 and ending 12/31/2022",
    "Name of plan",
    "Northwind Pension Plan",
    "Plan number 010",
    "Employer identification number 98-7654321",
    "Schedule H",
    "Total assets (add all amounts in lines 1a through 1e) 1f 1,000,000 1,250,000",
    "Total liabilities (add all amounts in lines 1g through 1j) 1k 100,000 120,000",
    "Net assets available for plan benefits (subtract line 1k from line 1f) 1l 900,000 1,130,000"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000e",
      ingestionTimestamp: "2026-04-01T00:00:00Z",
      fileName: "northwind-2022-label-first.pdf"
    }
  );

  assert.equal(extracted.fields.assetsBeginningOfYear.valueNumber, "1000000");
  assert.equal(extracted.fields.assetsEndOfYear.valueNumber, "1250000");
  assert.equal(extracted.fields.liabilitiesBeginningOfYear.valueNumber, "100000");
  assert.equal(extracted.fields.liabilitiesEndOfYear.valueNumber, "120000");
  assert.equal(extracted.fields.netAssetsBeginningOfYear.valueNumber, "900000");
  assert.equal(extracted.fields.netAssetsEndOfYear.valueNumber, "1130000");
});

test("schedule numeric rows parse when values are split onto the next line", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2022 and ending 12/31/2022",
    "Name of plan",
    "Northwind Pension Plan",
    "Plan number 010",
    "Employer identification number 98-7654321",
    "Schedule H",
    "Total assets (add all amounts in lines 1a through 1e)",
    "1f 1,000,000 1,250,000",
    "Total liabilities (add all amounts in lines 1g through 1j)",
    "1k 100,000 120,000",
    "Net assets available for plan benefits (subtract line 1k from line 1f)",
    "1l 900,000 1,130,000"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000f",
      ingestionTimestamp: "2026-04-02T00:00:00Z",
      fileName: "northwind-2022-split-rows.pdf"
    }
  );

  assert.equal(extracted.fields.assetsBeginningOfYear.valueNumber, "1000000");
  assert.equal(extracted.fields.assetsEndOfYear.valueNumber, "1250000");
  assert.equal(extracted.fields.liabilitiesBeginningOfYear.valueNumber, "100000");
  assert.equal(extracted.fields.liabilitiesEndOfYear.valueNumber, "120000");
  assert.equal(extracted.fields.netAssetsBeginningOfYear.valueNumber, "900000");
  assert.equal(extracted.fields.netAssetsEndOfYear.valueNumber, "1130000");
});

test("financial statements provide a fallback for net assets when schedule rows are masked", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 07/01/2021 and ending 06/30/2022",
    "Name of plan",
    "Northwind Pension Plan",
    "Plan number 010",
    "Employer identification number 98-7654321",
    "Schedule H",
    "1l Net assets (subtract line 1k from line 1f) 1l -123456789012345 -123456789012345",
    "STATEMENTS OF NET ASSETS AVAILABLE FOR PLAN BENEFITS June 30, 2022 and 2021 2022 2021",
    "Investments, at fair value 4,448,001 $ 6,069,063 $",
    "Accrued income receivable 143,003 21",
    "Net assets available for plan benefits 4,591,004 $ 6,069,084 $"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000g",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "northwind-2022-financial-statements.pdf"
    }
  );

  assert.equal(extracted.fields.netAssetsBeginningOfYear.valueNumber, "6069084");
  assert.equal(extracted.fields.netAssetsEndOfYear.valueNumber, "4591004");
});

test("redacted schedule placeholders are treated as missing instead of parsed values", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 07/01/2021 and ending 06/30/2022",
    "Name of plan",
    "Northwind Pension Plan",
    "Plan number 010",
    "Employer identification number 98-7654321",
    "Schedule H",
    "Schedule SB",
    "THE COLLEGE OF SAINT ROSE NON-CONTRACT EMPLOYEES' PENSION PLAN TABLE OF CONTENTS Page Independent Auditor's Report 1 Financial Statements Statements of Net Assets Available for Plan Benefits 5 Statements of Changes in Net Assets Available for Plan Benefits 6",
    "1l Net assets (subtract line 1k from line 1f) 1l -123456789012345 -123456789012345",
    "14 Funding target attainment percentage................................................................ 14 123.12 % 15 Adjusted funding target attainment percentage....................................................... 15 123.12 %"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000d",
      ingestionTimestamp: "2026-03-31T00:00:00Z",
      fileName: "northwind-2022-redacted.pdf"
    }
  );

  assert.equal(extracted.fields.netAssetsBeginningOfYear.parseStatus, "missing");
  assert.equal(extracted.fields.netAssetsEndOfYear.parseStatus, "missing");
  assert.equal(extracted.fields.fundingTargetAttainmentPercent.parseStatus, "missing");
  assert.equal(extracted.metrics.maskedNumericFieldCount, 3);
  assert.equal(extracted.metrics.filingNumericSufficiency, "insufficient");
  assert.equal(extracted.metrics.maskedCount, 3);
});

test("placeholder participant counts are treated as masked numeric evidence", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2024 and ending 12/31/2024",
    "Name of plan",
    "Northwind Pension Plan",
    "Plan number 010",
    "Employer identification number 98-7654321",
    "5 Total number of participants at the beginning of the plan year 5 123456789012",
    "b Retired or separated participants receiving benefits 6b 123456789012",
    "c Other retired or separated participants entitled to future benefits 6c 123456789012",
    "e Deceased participants whose beneficiaries are receiving or are entitled to receive benefits 6e 123456789012",
    "f Total. Add lines 6d and 6e . 6f 123456789012"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000e",
      ingestionTimestamp: "2026-04-02T00:00:00Z",
      fileName: "northwind-2024-placeholder-participants.pdf"
    }
  );

  assert.equal(extracted.fields.participantCountBeginningOfYear.parseStatus, "missing");
  assert.equal(extracted.fields.retiredParticipantsReceivingBenefits.parseStatus, "missing");
  assert.equal(extracted.fields.separatedParticipantsEntitledToBenefits.parseStatus, "missing");
  assert.equal(extracted.fields.deceasedParticipantsBeneficiaries.parseStatus, "missing");
  assert.equal(extracted.fields.participantCountTotal.parseStatus, "missing");
  assert.equal(extracted.metrics.maskedNumericFieldCount, 5);
  assert.equal(extracted.metrics.maskedCount, 5);
  assert.equal(extracted.metrics.filingNumericSufficiency, "insufficient");
});

test("schedule-bound fields are marked not present when the filing omits that schedule", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2022 and ending 12/31/2022",
    "Name of plan",
    "ACME Salaried Employees Retirement Plan",
    "Plan number 001",
    "Employer identification number 12-3456789"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1001",
      ingestionTimestamp: "2026-03-31T00:00:00Z",
      fileName: "acme-2022-no-schedules.pdf"
    }
  );

  const scheduleHException = extracted.extraction.exceptions.find((entry) => entry.fieldId === "assetsBeginningOfYear");
  assert.ok(scheduleHException);
  assert.equal(scheduleHException.code, "schedule-not-present");
  assert.match(scheduleHException.message, /Schedule H or I is not present/i);
  assert.equal(extracted.fields.assetsBeginningOfYear.parseStatus, "missing");
  assert.ok(extracted.metrics.notApplicableCount >= 1);
});

test("schedule i numeric rows satisfy canonical asset fields and numeric validation summary", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2023 and ending 12/31/2023",
    "Name of plan",
    "Harbor Services Pension Plan",
    "Plan number 002",
    "Employer identification number 11-2233445",
    "5 Total number of participants at the beginning of the plan year 5 85",
    "b Retired or separated participants receiving benefits 6b 12",
    "c Other retired or separated participants entitled to future benefits 6c 8",
    "e Deceased participants whose beneficiaries are receiving or are entitled to receive benefits 6e 1",
    "f Total. Add lines 6d and 6e . 6f 21",
    "Schedule I",
    "Schedule SB",
    "1f Total assets (add all amounts in lines 1a through 1e) 1f 250,000 300,000",
    "1k Total liabilities (add all amounts in lines 1g through 1j) 1k 20,000 35,000",
    "1l Net assets (subtract line 1k from line 1f) 1l 230,000 265,000",
    "14 Funding target attainment percentage................................................................ 14 82.5 %"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1002",
      ingestionTimestamp: "2026-04-01T00:00:00Z",
      fileName: "harbor-2023.pdf"
    }
  );

  assert.equal(extracted.fields.assetsBeginningOfYear.valueNumber, "250000");
  assert.equal(extracted.fields.assetsEndOfYear.valueNumber, "300000");
  assert.equal(extracted.fields.liabilitiesBeginningOfYear.valueNumber, "20000");
  assert.equal(extracted.fields.liabilitiesEndOfYear.valueNumber, "35000");
  assert.equal(extracted.fields.netAssetsBeginningOfYear.valueNumber, "230000");
  assert.equal(extracted.fields.netAssetsEndOfYear.valueNumber, "265000");
  assert.equal(extracted.fields.participantCountBeginningOfYear.valueNumber, "85");
  assert.equal(extracted.fields.fundingTargetAttainmentPercent.valueNumber, "0.825");
  assert.equal(extracted.metrics.filingNumericSufficiency, "sufficient");
  assert.ok(extracted.metrics.validatedNumericFieldCount >= 8);
});

test("participant line variants with 6a and 6g style codes are parsed", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2024 and ending 12/31/2024",
    "Name of plan",
    "Variant Pension Plan",
    "Plan number 003",
    "Employer identification number 22-3344556",
    "a Total number of participants at the beginning of the plan year 6a 410",
    "d Retired or separated participants receiving benefits 6d 39",
    "e Other retired or separated participants entitled to future benefits 6e 28",
    "f Deceased participants whose beneficiaries are receiving or are entitled to receive benefits 6f 3",
    "g Total number of participants 6g 480"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1003",
      ingestionTimestamp: "2026-04-01T00:00:00Z",
      fileName: "variant-2024.pdf"
    }
  );

  assert.equal(extracted.fields.participantCountBeginningOfYear.valueNumber, "410");
  assert.equal(extracted.fields.retiredParticipantsReceivingBenefits.valueNumber, "39");
  assert.equal(extracted.fields.separatedParticipantsEntitledToBenefits.valueNumber, "28");
  assert.equal(extracted.fields.deceasedParticipantsBeneficiaries.valueNumber, "3");
  assert.equal(extracted.fields.participantCountTotal.valueNumber, "480");
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
        "1f Total assets (add all amounts in lines 1a through 1e) 1f 500,000 700,000",
        "Schedule H"
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
