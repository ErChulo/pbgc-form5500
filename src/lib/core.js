(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500Core = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const VERSION = "0.7.0";
  const historicalRegistryApi =
    (typeof globalThis !== "undefined" && globalThis.Form5500HistoricalRegistry) ||
    (typeof require === "function" ? require("./schema/historical-registry.js") : null);
  const fieldMapperApi =
    (typeof globalThis !== "undefined" && globalThis.Form5500FieldMapper) ||
    (typeof require === "function" ? require("./extraction/field-mapper.js") : null);
  const scheduleRouterApi =
    (typeof globalThis !== "undefined" && globalThis.Form5500ScheduleRouter) ||
    (typeof require === "function" ? require("./extraction/schedule-router.js") : null);
  const qualityApi =
    (typeof globalThis !== "undefined" && globalThis.Form5500ExtractionQuality) ||
    (typeof require === "function" ? require("./extraction/quality.js") : null);

  function normalizeHeaderKey(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function toText(value) {
    return value == null ? "" : String(value).trim();
  }

  function quoteCsvCell(value) {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (inQuotes) {
        if (char === "\"" && next === "\"") {
          current += "\"";
          index += 1;
        } else if (char === "\"") {
          inQuotes = false;
        } else {
          current += char;
        }
        continue;
      }

      if (char === "\"") {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current);
        current = "";
      } else if (char === "\n") {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      } else if (char !== "\r") {
        current += char;
      }
    }

    row.push(current);
    if (row.some((value) => value !== "") || rows.length === 0) {
      rows.push(row);
    }

    return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
  }

  function rowsToObjects(rows) {
    if (!rows.length) {
      return { headers: [], objects: [] };
    }

    const headers = rows[0].map((header, index) => (header && header.trim() ? header.trim() : `column_${index + 1}`));
    const objects = rows.slice(1).map((cells) => {
      const object = {};
      headers.forEach((header, index) => {
        object[header] = cells[index] == null ? "" : cells[index];
      });
      return object;
    });
    return { headers, objects };
  }

  function normalizeNumberString(rawText) {
    const text = toText(rawText);
    if (!text) {
      return null;
    }

    let normalized = text.replace(/\$/g, "").replace(/,/g, "").replace(/\s+/g, "");
    let negative = false;
    if (/^\(.*\)$/.test(normalized)) {
      negative = true;
      normalized = normalized.slice(1, -1);
    }
    if (normalized.startsWith("-")) {
      negative = true;
      normalized = normalized.slice(1);
    }

    if (!/^\d*\.?\d+$/.test(normalized)) {
      return null;
    }

    if (normalized.includes(".")) {
      normalized = normalized.replace(/\.?0+$/, "");
      if (normalized.endsWith(".")) {
        normalized = normalized.slice(0, -1);
      }
    }

    if (!normalized) {
      return null;
    }

    return negative ? `-${normalized}` : normalized;
  }

  function parseDate(rawText) {
    const text = toText(rawText);
    if (!text) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, month, day, year] = match;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    return null;
  }

  function normalizeFieldValue(rawText, valueType, options) {
    const settings = options || {};
    const text = rawText == null ? null : String(rawText).trim();
    const base = {
      rawText: text,
      valueType,
      valueText: null,
      valueNumber: null,
      valueDate: null,
      valueBoolean: null,
      valueCode: null,
      parseStatus: "missing",
      parseNotes: null
    };

    if (!text) {
      return base;
    }

    if (valueType === "text") {
      return { ...base, valueText: text, parseStatus: "parsed" };
    }

    if (valueType === "integer" || valueType === "decimal" || valueType === "currency") {
      const valueNumber = normalizeNumberString(text);
      if (!valueNumber || (valueType === "integer" && valueNumber.includes("."))) {
        return { ...base, parseStatus: "failed", parseNotes: `Could not parse ${valueType}` };
      }
      return { ...base, valueNumber, parseStatus: "parsed" };
    }

    if (valueType === "percent") {
      const stripped = text.replace(/%/g, "");
      const valueNumber = normalizeNumberString(stripped);
      if (!valueNumber) {
        return { ...base, parseStatus: "failed", parseNotes: "Could not parse percent" };
      }
      const numeric = Number(valueNumber);
      const fraction = text.includes("%") || Math.abs(numeric) > 1 ? numeric / 100 : numeric;
      return {
        ...base,
        valueNumber: String(fraction).replace(/\.?0+$/, "").replace(/\.$/, ""),
        parseStatus: "parsed",
        parseNotes: "Percent values are normalized to fraction form."
      };
    }

    if (valueType === "date") {
      const valueDate = parseDate(text);
      if (!valueDate) {
        return { ...base, parseStatus: "failed", parseNotes: "Could not parse date" };
      }
      return { ...base, valueDate, parseStatus: "parsed" };
    }

    if (valueType === "boolean") {
      const normalized = text.toLowerCase();
      if (["true", "yes", "y", "1"].includes(normalized)) {
        return { ...base, valueBoolean: true, parseStatus: "parsed" };
      }
      if (["false", "no", "n", "0"].includes(normalized)) {
        return { ...base, valueBoolean: false, parseStatus: "parsed" };
      }
      return { ...base, parseStatus: "failed", parseNotes: "Could not parse boolean" };
    }

    if (valueType === "code") {
      if (settings.codeList && settings.codeList.length && !settings.codeList.includes(text)) {
        return { ...base, valueCode: text, parseStatus: "failed", parseNotes: "Code is not in the allowed list" };
      }
      return { ...base, valueCode: text, parseStatus: "parsed" };
    }

    return { ...base, valueText: text, parseStatus: "parsed" };
  }

  function inferDatesFromFilename(name) {
    const text = toText(name);
    if (!text) {
      return { begin: null, end: null };
    }

    let match = text.match(/(20\d{2})[-_]?(\d{2})[-_]?(\d{2}).*?(20\d{2})[-_]?(\d{2})[-_]?(\d{2})/);
    if (match) {
      return {
        begin: `${match[1]}-${match[2]}-${match[3]}`,
        end: `${match[4]}-${match[5]}-${match[6]}`
      };
    }

    match = text.match(/\b(20\d{2})\b/);
    if (match) {
      return {
        begin: `${match[1]}-01-01`,
        end: `${match[1]}-12-31`
      };
    }

    return { begin: null, end: null };
  }

  function getDefaultSchemaRegistry() {
    if (historicalRegistryApi && typeof historicalRegistryApi.getBaseSchemaRegistry === "function") {
      return historicalRegistryApi.getBaseSchemaRegistry();
    }
    return [];
  }

  function createEmptyField(valueType) {
    return normalizeFieldValue(null, valueType);
  }

  function getFieldText(field) {
    if (!field) {
      return "";
    }
    if (field.valueDate) {
      return field.valueDate;
    }
    if (field.valueNumber != null) {
      return field.valueNumber;
    }
    if (field.valueBoolean != null) {
      return field.valueBoolean ? "true" : "false";
    }
    if (field.valueCode) {
      return field.valueCode;
    }
    if (field.valueText) {
      return field.valueText;
    }
    return field.rawText || "";
  }

  function createExtractedRecord(input) {
    const source = input || {};
    const schemaRegistry = source.schemaRegistry || getDefaultSchemaRegistry();
    const fields = {};

    schemaRegistry.forEach((definition) => {
      const provided = source.fieldMap && source.fieldMap[definition.fieldId];
      fields[definition.fieldId] = provided || createEmptyField(definition.dataType);
    });

    const extracted = {
      ingestId: source.ingestId || "",
      planName: source.planName || fields.planName || createEmptyField("text"),
      planNumber: source.planNumber || fields.planNumber || createEmptyField("code"),
      sponsorEmployerIdentificationNumber:
        source.sponsorEmployerIdentificationNumber ||
        fields.sponsorEmployerIdentificationNumber ||
        createEmptyField("code"),
      planYearBeginDate: source.planYearBeginDate || fields.planYearBeginDate || createEmptyField("date"),
      planYearEndDate: source.planYearEndDate || fields.planYearEndDate || createEmptyField("date"),
      filingKind: source.filingKind || createEmptyField("text"),
      receivedTimestamp: source.receivedTimestamp || createEmptyField("text"),
      fields,
      metrics: { parsedFieldCount: 0, expectedFieldCount: 0 },
      ingestionTimestamp: source.ingestionTimestamp || new Date().toISOString(),
      extraction: source.extraction || {
        evidence: [],
        exceptions: [],
        context: null,
        sourceKind: "unknown",
        ocr: null
      }
    };

    const fieldValues = [
      extracted.planName,
      extracted.planNumber,
      extracted.sponsorEmployerIdentificationNumber,
      extracted.planYearBeginDate,
      extracted.planYearEndDate,
      extracted.filingKind,
      extracted.receivedTimestamp,
      ...Object.values(fields)
    ];

    const parsedFieldCount = fieldValues.filter((field) => field && field.parseStatus === "parsed").length;
    extracted.metrics = {
      parsedFieldCount,
      expectedFieldCount: fieldValues.length
    };

    return extracted;
  }

  function buildExtractedFromCsvRow(row, options) {
    const source = options || {};
    const schemaRegistry = source.schemaRegistry || getDefaultSchemaRegistry();
    const begin = row.planYearBeginDate || row.planYearStart || "";
    const end = row.planYearEndDate || row.planYearFinish || "";
    const planYear = row.planYear || "";
    const inferredYearDates = planYear && /^\d{4}$/.test(planYear)
      ? { begin: `${planYear}-01-01`, end: `${planYear}-12-31` }
      : { begin: "", end: "" };

    const fieldMap = {
      planName: normalizeFieldValue(row.planName, "text"),
      planNumber: normalizeFieldValue(row.planNumber, "code"),
      sponsorEmployerIdentificationNumber: normalizeFieldValue(row.sponsorEmployerIdentificationNumber, "code"),
      planYearBeginDate: normalizeFieldValue(begin || inferredYearDates.begin, "date"),
      planYearEndDate: normalizeFieldValue(end || inferredYearDates.end, "date"),
      participantCountTotal: normalizeFieldValue(row.participantCountTotal, "integer")
    };

    return createExtractedRecord({
      ingestId: source.ingestId,
      schemaRegistry,
      fieldMap,
      planName: fieldMap.planName,
      planNumber: fieldMap.planNumber,
      sponsorEmployerIdentificationNumber: fieldMap.sponsorEmployerIdentificationNumber,
      planYearBeginDate: fieldMap.planYearBeginDate,
      planYearEndDate: fieldMap.planYearEndDate,
      filingKind: normalizeFieldValue(row.filingKind || row.amendmentStatus || "original", "text"),
      receivedTimestamp: normalizeFieldValue(row.receivedTimestamp || row.receivedDate || "", "text"),
      ingestionTimestamp: source.ingestionTimestamp
    });
  }

  function buildExtractedFromFilename(name, options) {
    const source = options || {};
    const inferredDates = inferDatesFromFilename(name);
    return createExtractedRecord({
      ingestId: source.ingestId,
      planName: createEmptyField("text"),
      planNumber: createEmptyField("code"),
      sponsorEmployerIdentificationNumber: createEmptyField("code"),
      planYearBeginDate: normalizeFieldValue(inferredDates.begin, "date"),
      planYearEndDate: normalizeFieldValue(inferredDates.end, "date"),
      filingKind: normalizeFieldValue("original", "text"),
      receivedTimestamp: createEmptyField("text"),
      schemaRegistry: source.schemaRegistry,
      ingestionTimestamp: source.ingestionTimestamp
    });
  }

  function buildExtractedFromPdfData(pdfData, options) {
    const source = options || {};
    const initialContext = scheduleRouterApi && typeof scheduleRouterApi.detectContext === "function"
      ? scheduleRouterApi.detectContext(pdfData.documentText, source.fileName || "")
      : { filingYear: 2024, schedules: [] };
    const schemaRegistry = source.schemaRegistry ||
      (historicalRegistryApi && typeof historicalRegistryApi.getHistoricalSchemaRegistry === "function"
        ? historicalRegistryApi.getHistoricalSchemaRegistry(initialContext.filingYear)
        : getDefaultSchemaRegistry());
    const mapped = fieldMapperApi && typeof fieldMapperApi.mapDocumentFields === "function"
      ? fieldMapperApi.mapDocumentFields({
          documentText: pdfData.documentText,
          pages: pdfData.pages || [],
          schemaRegistry,
          normalizeFieldValue,
          context: initialContext
        })
      : { fieldMap: {}, evidence: [], exceptions: [], filingKind: "original" };
    const inferredDates = inferDatesFromFilename(source.fileName || "");

    if (mapped.fieldMap.planYearBeginDate && mapped.fieldMap.planYearBeginDate.parseStatus !== "parsed" && inferredDates.begin) {
      mapped.fieldMap.planYearBeginDate = normalizeFieldValue(inferredDates.begin, "date");
    }
    if (mapped.fieldMap.planYearEndDate && mapped.fieldMap.planYearEndDate.parseStatus !== "parsed" && inferredDates.end) {
      mapped.fieldMap.planYearEndDate = normalizeFieldValue(inferredDates.end, "date");
    }

    const extracted = createExtractedRecord({
      ingestId: source.ingestId,
      schemaRegistry,
      fieldMap: mapped.fieldMap,
      planName: mapped.fieldMap.planName || createEmptyField("text"),
      planNumber: mapped.fieldMap.planNumber || createEmptyField("code"),
      sponsorEmployerIdentificationNumber:
        mapped.fieldMap.sponsorEmployerIdentificationNumber || createEmptyField("code"),
      planYearBeginDate: mapped.fieldMap.planYearBeginDate || createEmptyField("date"),
      planYearEndDate: mapped.fieldMap.planYearEndDate || createEmptyField("date"),
      filingKind: normalizeFieldValue(mapped.filingKind || "original", "text"),
      receivedTimestamp: createEmptyField("text"),
      ingestionTimestamp: source.ingestionTimestamp,
      extraction: {
        evidence: mapped.evidence || [],
        exceptions: mapped.exceptions || [],
        context: initialContext,
        sourceKind: pdfData.textSource || "native",
        ocr: source.ocr || null
      }
    });

    if (qualityApi && typeof qualityApi.summarizeFieldMap === "function") {
      extracted.metrics = qualityApi.summarizeFieldMap({
        planName: extracted.planName,
        planNumber: extracted.planNumber,
        sponsorEmployerIdentificationNumber: extracted.sponsorEmployerIdentificationNumber,
        planYearBeginDate: extracted.planYearBeginDate,
        planYearEndDate: extracted.planYearEndDate,
        filingKind: extracted.filingKind,
        receivedTimestamp: extracted.receivedTimestamp,
        ...extracted.fields
      });
    }

    if (qualityApi && typeof qualityApi.summarizeNumericValidation === "function") {
      const numericValidation = qualityApi.summarizeNumericValidation(extracted.fields, schemaRegistry, extracted.extraction.exceptions);
      extracted.metrics = {
        ...extracted.metrics,
        ...numericValidation
      };
      extracted.extraction.numericValidation = numericValidation;
    }

    if (qualityApi && typeof qualityApi.summarizeReviewState === "function") {
      const reviewState = qualityApi.summarizeReviewState(extracted.extraction.exceptions);
      extracted.metrics = {
        ...extracted.metrics,
        ...reviewState
      };
      extracted.extraction.reviewState = reviewState;
    }

    return extracted;
  }

  function parseDateTime(text) {
    const value = toText(text);
    if (!value) {
      return null;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  function filingKindScore(field) {
    const text = getFieldText(field).toLowerCase();
    let score = 0;
    if (text.includes("amended")) {
      score += 2;
    }
    if (text.includes("final")) {
      score += 1;
    }
    return score;
  }

  function comparePreferredFiling(a, b) {
    const receivedA = parseDateTime(getFieldText(a.receivedTimestamp));
    const receivedB = parseDateTime(getFieldText(b.receivedTimestamp));

    if (receivedA != null || receivedB != null) {
      if (receivedA == null) return -1;
      if (receivedB == null) return 1;
      if (receivedA !== receivedB) return receivedA > receivedB ? 1 : -1;
    }

    const kindScoreA = filingKindScore(a);
    const kindScoreB = filingKindScore(b);
    if (kindScoreA !== kindScoreB) {
      return kindScoreA > kindScoreB ? 1 : -1;
    }

    const ingestionA = parseDateTime(a.ingestionTimestamp);
    const ingestionB = parseDateTime(b.ingestionTimestamp);
    if (ingestionA !== ingestionB) {
      return ingestionA > ingestionB ? 1 : -1;
    }

    return String(a.ingestId || "").localeCompare(String(b.ingestId || ""));
  }

  function aggregateAllYears(extractedRecords, schemaRegistry) {
    const registry = schemaRegistry || getDefaultSchemaRegistry();
    const grouped = new Map();

    extractedRecords.forEach((record) => {
      const begin = getFieldText(record.planYearBeginDate);
      const end = getFieldText(record.planYearEndDate);
      const key = begin || end ? `${begin}|${end}` : `unknown|${record.ingestId}`;
      const existing = grouped.get(key);
      if (!existing || comparePreferredFiling(record, existing) > 0) {
        grouped.set(key, record);
      }
    });

    const records = Array.from(grouped.values()).sort((left, right) => {
      const leftEnd = getFieldText(left.planYearEndDate) || "9999-12-31";
      const rightEnd = getFieldText(right.planYearEndDate) || "9999-12-31";
      if (leftEnd !== rightEnd) return leftEnd.localeCompare(rightEnd);
      const leftBegin = getFieldText(left.planYearBeginDate) || "9999-12-31";
      const rightBegin = getFieldText(right.planYearBeginDate) || "9999-12-31";
      if (leftBegin !== rightBegin) return leftBegin.localeCompare(rightBegin);
      return String(left.ingestId || "").localeCompare(String(right.ingestId || ""));
    });

    const mandatoryColumns = [
      { key: "planName", label: "planName" },
      { key: "planNumber", label: "planNumber" },
      { key: "sponsorEmployerIdentificationNumber", label: "sponsorEmployerIdentificationNumber" },
      { key: "planYearBeginDate", label: "planYearBeginDate" },
      { key: "planYearEndDate", label: "planYearEndDate" },
      { key: "filingKind", label: "filingKind" },
      { key: "receivedTimestamp", label: "receivedTimestamp" },
      { key: "extractionQuality", label: "extractionQuality" }
    ];

    const additionalColumns = registry
      .filter((definition) => definition.exportGroup === "allYears")
      .filter((definition) => !mandatoryColumns.some((column) => column.key === definition.name))
      .sort((left, right) => left.exportOrder - right.exportOrder)
      .map((definition) => ({ key: definition.name, label: definition.headerLabel || definition.name, fieldId: definition.fieldId }));

    const rows = records.map((record) => {
      const row = {
        planName: getFieldText(record.planName),
        planNumber: getFieldText(record.planNumber),
        sponsorEmployerIdentificationNumber: getFieldText(record.sponsorEmployerIdentificationNumber),
        planYearBeginDate: getFieldText(record.planYearBeginDate),
        planYearEndDate: getFieldText(record.planYearEndDate),
        filingKind: getFieldText(record.filingKind),
        receivedTimestamp: getFieldText(record.receivedTimestamp),
        extractionQuality: `${record.metrics.parsedFieldCount}/${record.metrics.expectedFieldCount}`
      };

      additionalColumns.forEach((column) => {
        row[column.key] = getFieldText(record.fields[column.fieldId]);
      });

      return row;
    });

    return { rows, mandatoryColumns, additionalColumns };
  }

  function summarizeValidationCorpus(extractedRecords) {
    const records = Array.isArray(extractedRecords) ? extractedRecords.slice() : [];
    const totals = {
      filingCount: records.length,
      sufficientFilingCount: 0,
      partialFilingCount: 0,
      insufficientFilingCount: 0,
      validatedNumericFieldCount: 0,
      targetedNumericFieldCount: 0,
      maskedNumericFieldCount: 0,
      failedNumericFieldCount: 0,
      unresolvedNumericFieldCount: 0,
      notApplicableNumericFieldCount: 0
    };

    records.forEach((record) => {
      const metrics = (record && record.metrics) || {};
      const sufficiency = metrics.filingNumericSufficiency || "insufficient";
      if (sufficiency === "sufficient") {
        totals.sufficientFilingCount += 1;
      } else if (sufficiency === "partial") {
        totals.partialFilingCount += 1;
      } else {
        totals.insufficientFilingCount += 1;
      }

      totals.validatedNumericFieldCount += Number(metrics.validatedNumericFieldCount || 0);
      totals.targetedNumericFieldCount += Number(metrics.targetedNumericFieldCount || 0);
      totals.maskedNumericFieldCount += Number(metrics.maskedNumericFieldCount || 0);
      totals.failedNumericFieldCount += Number(metrics.failedNumericFieldCount || 0);
      totals.unresolvedNumericFieldCount += Number(metrics.unresolvedNumericFieldCount || 0);
      totals.notApplicableNumericFieldCount += Number(metrics.notApplicableNumericFieldCount || 0);
    });

    return totals;
  }

  function toCsv(columns, rows) {
    const header = columns.map((column) => quoteCsvCell(column.label)).join(",");
    const body = rows.map((row) => columns.map((column) => quoteCsvCell(row[column.key] || "")).join(","));
    return [header, ...body].join("\n");
  }

  function createExportFileName(rows, version) {
    if (!rows.length) {
      return `form5500-all-years-v${version}.csv`;
    }

    const first = rows[0];
    const planNumber = first.planNumber || "";
    const ein = first.sponsorEmployerIdentificationNumber || "";
    const years = rows
      .map((row) => (row.planYearEndDate || "").slice(0, 4))
      .filter(Boolean)
      .sort();
    const segments = ["form5500-all-years"];
    if (planNumber) segments.push(planNumber);
    if (ein) segments.push(ein);
    if (years.length) {
      segments.push(years[0]);
      if (years[years.length - 1] !== years[0]) {
        segments.push(years[years.length - 1]);
      }
    }
    segments.push(`v${version}`);
    return `${segments.join("-")}.csv`;
  }

  function detectEfastColumns(headers) {
    const aliasMap = {
      planName: ["planname", "nameoftheplan", "plan_name", "plannm"],
      planNumber: ["plannumber", "pn", "planno", "plan_num"],
      sponsorEmployerIdentificationNumber: ["sponsorein", "employeridentificationnumber", "ein", "sponsor_employer_identification_number"],
      planYearBeginDate: ["planyearbegindate", "planyearstartdate", "plan_year_begin_date", "periodbegin", "yearbegin"],
      planYearEndDate: ["planyearenddate", "planyearend", "plan_year_end_date", "periodend", "yearend"],
      planYear: ["planyear", "year", "plan_year"],
      filingKind: ["filingkind", "amendmentstatus", "amended", "filing_type"],
      receivedTimestamp: ["receivedtimestamp", "receiveddate", "received", "filingreceiveddate"],
      participantCountTotal: ["participantcounttotal", "totparticipants", "participantcount"],
      pdfUrl: ["pdfurl", "pdf", "documentpdfurl", "filingpdfurl"],
      detailUrl: ["detailurl", "filingdetailurl", "detail", "detailsurl"]
    };

    const normalizedHeaders = headers.map((header) => ({
      raw: header,
      normalized: normalizeHeaderKey(header)
    }));

    const mapping = {};
    Object.entries(aliasMap).forEach(([key, aliases]) => {
      const found = normalizedHeaders.find((header) => aliases.includes(header.normalized));
      if (found) {
        mapping[key] = found.raw;
      }
    });

    return mapping;
  }

  function extractRemoteUrlFromObject(rowObject, mapping) {
    const orderedKeys = [];
    if (mapping.pdfUrl) {
      orderedKeys.push(mapping.pdfUrl);
    }
    orderedKeys.push(...Object.keys(rowObject));

    for (const key of orderedKeys) {
      const normalizedKey = normalizeHeaderKey(key);
      const value = toText(rowObject[key]);
      if (!value) {
        continue;
      }
      const explicitPdfHeader =
        normalizedKey.includes("pdf") ||
        normalizedKey.includes("documentlinkpdf") ||
        normalizedKey.includes("filingpdf");
      const directPdfValue = /\.pdf(\?|#|$)/i.test(value);

      if (/^https?:\/\//i.test(value) && (directPdfValue || explicitPdfHeader)) {
        return value;
      }
    }

    return null;
  }

  function ingestEfastCsv(text, options) {
    const source = options || {};
    const parsed = rowsToObjects(parseCsv(text));
    const mapping = detectEfastColumns(parsed.headers);
    const records = parsed.objects.map((rowObject, index) => {
      const canonical = {
        planName: rowObject[mapping.planName || ""] || "",
        planNumber: rowObject[mapping.planNumber || ""] || "",
        sponsorEmployerIdentificationNumber: rowObject[mapping.sponsorEmployerIdentificationNumber || ""] || "",
        planYearBeginDate: rowObject[mapping.planYearBeginDate || ""] || "",
        planYearEndDate: rowObject[mapping.planYearEndDate || ""] || "",
        planYear: rowObject[mapping.planYear || ""] || "",
        filingKind: rowObject[mapping.filingKind || ""] || "",
        receivedTimestamp: rowObject[mapping.receivedTimestamp || ""] || "",
        participantCountTotal: rowObject[mapping.participantCountTotal || ""] || "",
        pdfUrl: extractRemoteUrlFromObject(rowObject, mapping),
        detailUrl: rowObject[mapping.detailUrl || ""] || ""
      };

      return {
        rowNumber: index + 2,
        sourceType: "remoteFromCsv",
        displayName: canonical.planName || `EFAST row ${index + 2}`,
        metadata: canonical,
        originalRow: rowObject,
        remoteUrl: canonical.pdfUrl || null
      };
    });

    return { headers: parsed.headers, mapping, records, sourceName: source.sourceName || "uploaded.csv" };
  }

  return {
    VERSION,
    aggregateAllYears,
    buildExtractedFromCsvRow,
    buildExtractedFromFilename,
    buildExtractedFromPdfData,
    comparePreferredFiling,
    createExportFileName,
    detectEfastColumns,
    getDefaultSchemaRegistry,
    getFieldText,
    ingestEfastCsv,
    normalizeFieldValue,
    parseCsv,
    quoteCsvCell,
    summarizeValidationCorpus,
    toCsv
  };
});
