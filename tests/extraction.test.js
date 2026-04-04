const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const core = require("../src/lib/core.js");
const historicalRegistry = require("../src/lib/schema/historical-registry.js");
const scheduleRouter = require("../src/lib/extraction/schedule-router.js");
const ocrPipeline = require("../src/lib/extraction/ocr-pipeline.js");

function loadFeature006Expectations() {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, "fixtures", "feature-006", "expected-values.json"), "utf8")
  );
}

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

test("financial statement fallback accepts benefit-plan statements without the plan word", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2021 and ending 12/31/2021",
    "Name of plan",
    "Northwind 403(b) Retirement Plan",
    "Plan number 010",
    "Employer identification number 98-7654321",
    "Schedule H",
    "1l Net assets (subtract line 1k from line 1f) 1l -123456789012345 -123456789012345",
    "STATEMENTS OF NET ASSETS AVAILABLE FOR BENEFITS December 31, 2021 and 2020 2021 2020",
    "ASSETS Investments at fair value 126,991,219 $ 116,901,324 $",
    "Investments at contract value 11,183,842 11,872,644",
    "Notes receivable from participants 45,486 3,793",
    "Net assets available for benefits 138,220,547 $ 128,777,761 $"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000j",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "northwind-403b-benefits-statements.pdf"
    }
  );

  assert.equal(extracted.fields.netAssetsBeginningOfYear.valueNumber, "128777761");
  assert.equal(extracted.fields.netAssetsEndOfYear.valueNumber, "138220547");
});

test("financial statements provide a fallback for total assets from explicit asset rows", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2021 and ending 12/31/2021",
    "Name of plan",
    "Northwind 403(b) Retirement Plan",
    "Plan number 010",
    "Employer identification number 98-7654321",
    "Schedule H",
    "1f Total assets 1f -123456789012345 -123456789012345",
    "STATEMENTS OF NET ASSETS AVAILABLE FOR BENEFITS December 31, 2021 and 2020 2021 2020",
    "ASSETS Investments at fair value 126,991,219 $ 116,901,324 $",
    "Investments at contract value 11,183,842 11,872,644",
    "Notes receivable from participants 45,486 3,793",
    "Net assets available for benefits 138,220,547 $ 128,777,761 $"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000k",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "northwind-403b-assets-statements.pdf"
    }
  );

  assert.equal(extracted.fields.assetsBeginningOfYear.valueNumber, "128777761");
  assert.equal(extracted.fields.assetsEndOfYear.valueNumber, "138220547");
});

test("auditor report text maps explicit accountant opinion states", () => {
  const unmodifiedText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Schedule H",
    "INDEPENDENT AUDITOR'S REPORT",
    "Opinion",
    "In our opinion, based on our audits and on the procedures performed as described in the Auditor's Responsibilities for the Audit of the Financial Statements section the amounts and disclosures in the accompanying financial statements are presented fairly, in all material respects, in accordance with accounting principles generally accepted in the United States of America."
  ].join("\n");

  const disclaimerText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Schedule H",
    "Auditor's Report on the 2021 Financial Statements",
    "We were engaged to audit the 2021 financial statements.",
    "Because of the significance of the information that we did not audit, we were not able to obtain sufficient appropriate audit evidence to provide a basis for an audit opinion and accordingly, we did not express an opinion on the 2021 financial statements."
  ].join("\n");

  const unmodified = core.buildExtractedFromPdfData(
    {
      documentText: unmodifiedText,
      pages: [{ pageNumber: 1, text: unmodifiedText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000h",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "northwind-unmodified-opinion.pdf"
    }
  );

  const disclaimer = core.buildExtractedFromPdfData(
    {
      documentText: disclaimerText,
      pages: [{ pageNumber: 1, text: disclaimerText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1000i",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "northwind-disclaimer-opinion.pdf"
    }
  );

  assert.equal(unmodified.fields.scheduleHAccountantOpinion.valueText, "unmodified opinion");
  assert.equal(disclaimer.fields.scheduleHAccountantOpinion.valueText, "disclaimer of opinion");
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
  assert.equal(extracted.metrics.filingNumericSufficiency, "partial");
  assert.ok(extracted.metrics.validatedNumericFieldCount >= 8);
});

test("feature 006 representative corpus metadata is available for validation scaffolding", () => {
  const expectedValues = loadFeature006Expectations();

  assert.equal(expectedValues.featureId, "006-full-filing-extraction");
  assert.equal(
    expectedValues.fixtures["college-st-rose-2021-pension"].scheduleHAccountantOpinion,
    "disclaimer of opinion"
  );
  assert.equal(expectedValues.fixtures["college-st-rose-2024-pension"].assetsEndOfYear, "2330438");
});

test("expanded main-form and schedule-r fields map into the full filing scaffold", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2024 and ending 12/31/2024",
    "Name of plan",
    "Variant Pension Plan",
    "Plan number 003",
    "Effective date of plan 01/01/1995",
    "Employer identification number 22-3344556",
    "Name of plan sponsor",
    "Variant Holdings, Inc.",
    "Telephone number of plan sponsor 518-555-1212",
    "Mailing address 100 Main Street Albany, NY 12207",
    "Business code 611000",
    "The plan administrator is the same as plan sponsor",
    "Schedule R",
    "13 Contributing employers 13 4",
    "14a Inactive participants receiving benefits 14a 39"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1006",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "variant-2024-full-scaffold.pdf"
    }
  );

  assert.equal(extracted.fields.planEffectiveDate.valueDate, "1995-01-01");
  assert.equal(extracted.fields.sponsorTelephoneNumber.valueText, "518-555-1212");
  assert.equal(extracted.fields.planAdministratorSameAsSponsor.valueBoolean, true);
  assert.equal(extracted.fields.contributingEmployerCount.valueNumber, "4");
  assert.equal(extracted.fields.inactiveParticipantCount.valueNumber, "39");
});

test("attachment-derived financial statement and actuarial values map into the expanded scaffold", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2024 and ending 12/31/2024",
    "Name of plan",
    "Variant Pension Plan",
    "Plan number 003",
    "Employer identification number 22-3344556",
    "Schedule H",
    "Schedule SB",
    "STATEMENTS OF CHANGES IN NET ASSETS AVAILABLE FOR PLAN BENEFITS Year ended December 31, 2024 and 2023 2024 2023",
    "Employer contributions 250,000 $ 225,000 $",
    "Interest and dividend income 100,000 90,000",
    "Benefits paid to participants 175,000 165,000",
    "Administrative expenses 25,000 20,000",
    "Net increase (decrease) before transfers to and from other plans 150,000 130,000",
    "Actuarial present value of accumulated plan benefits 4,500,000"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1007",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "variant-2024-attachments.pdf"
    }
  );

  assert.equal(extracted.fields.employerContributions.valueNumber, "250000");
  assert.equal(extracted.fields.investmentIncome.valueNumber, "100000");
  assert.equal(extracted.fields.benefitsPaid.valueNumber, "175000");
  assert.equal(extracted.fields.administrativeExpenses.valueNumber, "25000");
  assert.equal(extracted.fields.netChangeInAssets.valueNumber, "150000");
  assert.equal(extracted.fields.actuarialPresentValueOfAccumulatedPlanBenefits.valueNumber, "4500000");
});

test("financial statement row extractors ignore table-of-contents page numbers and year headers", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 07/01/2021 and ending 06/30/2022",
    "Name of plan",
    "Northwind Pension Plan",
    "Plan number 010",
    "Employer identification number 98-7654321",
    "Schedule H",
    "TABLE OF CONTENTS Page Independent Auditor's Report 1 Statements of Changes in Net Assets Available for Plan Benefits 6",
    "STATEMENTS OF CHANGES IN NET ASSETS AVAILABLE FOR PLAN BENEFITS Year ended June 30, 2022 and 2021 2022 2021",
    "Employer contributions 250,000 225,000",
    "Benefits paid to participants 175,000 165,000",
    "Interest and dividend income 100,000 90,000"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1007b",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "northwind-attachments-noise.pdf"
    }
  );

  assert.equal(extracted.fields.employerContributions.valueNumber, "250000");
  assert.equal(extracted.fields.benefitsPaid.valueNumber, "175000");
  assert.equal(extracted.fields.investmentIncome.valueNumber, "100000");
});

test("plan effective date is not inferred from summary footer dates without an explicit label", () => {
  const documentText = [
    "Form 5500 (2024) v. 240311 01/01/2021 12/31/2021 X X X X THE COLLEGE OF SAINT ROSE 403(B) RETIREMENT PLAN 002 10/02/1954 14-1338371 THE COLLEGE OF SAINT ROSE 518-454-5138 432 WESTERN AVENUE ALBANY, NY 12203 611000 Filed with authorized/valid electronic signature."
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1007c",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "summary-footer-no-effective-label.pdf"
    }
  );

  assert.equal(extracted.fields.planEffectiveDate.parseStatus, "missing");
  assert.equal(extracted.planNumber.valueCode, "002");
});

test("schedule a c and g boolean fields map into the expanded scaffold", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2024 and ending 12/31/2024",
    "Name of plan",
    "Variant Pension Plan",
    "Plan number 003",
    "Employer identification number 22-3344556",
    "Schedule A",
    "Insurance in force yes",
    "Schedule C",
    "Indirect compensation yes",
    "Schedule G",
    "Reportable transactions no"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1008",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "variant-2024-schedule-flags.pdf"
    }
  );

  assert.equal(extracted.fields.insuranceInForce.valueBoolean, true);
  assert.equal(extracted.fields.serviceProviderCompensationIndirect.valueBoolean, true);
  assert.equal(extracted.fields.reportableTransactionsPresent.valueBoolean, false);
});

test("expanded filing records preserve detected schedules and typed evidence source types", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2024 and ending 12/31/2024",
    "Name of plan",
    "Variant Pension Plan",
    "Plan number 003",
    "Employer identification number 22-3344556",
    "Schedule H",
    "Schedule SB",
    "STATEMENTS OF CHANGES IN NET ASSETS AVAILABLE FOR PLAN BENEFITS Year ended December 31, 2024 and 2023 2024 2023",
    "Employer contributions 250,000 $ 225,000 $",
    "Actuarial present value of accumulated plan benefits 4,500,000"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1009",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "variant-2024-context.pdf"
    }
  );

  assert.equal(extracted.fileName, "variant-2024-context.pdf");
  assert.equal(extracted.filingYear, "2024");
  assert.deepEqual(extracted.detectedSchedules, ["H", "SB"]);
  assert.equal(
    extracted.extraction.evidence.find((entry) => entry.fieldId === "employerContributions").sourceType,
    "financial-statement"
  );
  assert.equal(
    extracted.extraction.evidence.find((entry) => entry.fieldId === "actuarialPresentValueOfAccumulatedPlanBenefits").sourceType,
    "actuarial-attachment"
  );
});

test("conflicting schedule and attachment values are preserved for review", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2024 and ending 12/31/2024",
    "Name of plan",
    "Variant Pension Plan",
    "Plan number 003",
    "Employer identification number 22-3344556",
    "Schedule H",
    "1l Net assets (subtract line 1k from line 1f) 1l 900,000 1,130,000",
    "STATEMENTS OF NET ASSETS AVAILABLE FOR PLAN BENEFITS December 31, 2024 and 2023 2024 2023",
    "Net assets available for plan benefits 1,200,000 $ 950,000 $"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1011",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "variant-2024-conflict.pdf"
    }
  );

  assert.equal(extracted.fields.netAssetsBeginningOfYear.valueNumber, "900000");
  assert.equal(extracted.fields.netAssetsEndOfYear.valueNumber, "1130000");
  assert.ok(extracted.extraction.exceptions.some((entry) => entry.fieldId === "netAssetsBeginningOfYear" && entry.code === "conflict"));
  assert.ok(extracted.extraction.exceptions.some((entry) => entry.fieldId === "netAssetsEndOfYear" && entry.code === "conflict"));
  assert.ok(
    extracted.extraction.evidence.some((entry) => entry.fieldId === "netAssetsBeginningOfYear" && entry.status === "conflicting")
  );
  assert.ok(extracted.metrics.conflictCount >= 2);
});

test("schedule mb actuarial attachment values satisfy the shared canonical field", () => {
  const documentText = [
    "Annual Return/Report of Employee Benefit Plan",
    "Beginning 01/01/2024 and ending 12/31/2024",
    "Name of plan",
    "Variant Multiemployer Plan",
    "Plan number 004",
    "Employer identification number 22-3344556",
    "Schedule MB",
    "Actuarial present value of accumulated plan benefits 7,250,000"
  ].join("\n");

  const extracted = core.buildExtractedFromPdfData(
    {
      documentText,
      pages: [{ pageNumber: 1, text: documentText }],
      pageCount: 1,
      textSource: "native"
    },
    {
      ingestId: "ing-1010",
      ingestionTimestamp: "2026-04-04T00:00:00Z",
      fileName: "variant-2024-mb.pdf"
    }
  );

  assert.deepEqual(extracted.detectedSchedules, ["MB"]);
  assert.equal(extracted.fields.actuarialPresentValueOfAccumulatedPlanBenefits.valueNumber, "7250000");
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
