(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500Core = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const VERSION = "0.7.0";

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
    return [
      {
        fieldId: "planName",
        name: "planName",
        headerLabel: "planName",
        dataType: "text",
        locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 1a", instructionsYear: 2024 },
        exportGroup: "allYears",
        exportOrder: 1
      },
      {
        fieldId: "planNumber",
        name: "planNumber",
        headerLabel: "planNumber",
        dataType: "code",
        locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 1b", instructionsYear: 2024 },
        exportGroup: "allYears",
        exportOrder: 2
      },
      {
        fieldId: "sponsorEmployerIdentificationNumber",
        name: "sponsorEmployerIdentificationNumber",
        headerLabel: "sponsorEmployerIdentificationNumber",
        dataType: "code",
        locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 2b", instructionsYear: 2024 },
        exportGroup: "allYears",
        exportOrder: 3
      },
      {
        fieldId: "planYearBeginDate",
        name: "planYearBeginDate",
        headerLabel: "planYearBeginDate",
        dataType: "date",
        locationRef: { form: "Form 5500", schedule: null, part: "Part I", line: "Line B", instructionsYear: 2024 },
        exportGroup: "allYears",
        exportOrder: 4
      },
      {
        fieldId: "planYearEndDate",
        name: "planYearEndDate",
        headerLabel: "planYearEndDate",
        dataType: "date",
        locationRef: { form: "Form 5500", schedule: null, part: "Part I", line: "Line B", instructionsYear: 2024 },
        exportGroup: "allYears",
        exportOrder: 5
      },
      {
        fieldId: "participantCountTotal",
        name: "participantCountTotal",
        headerLabel: "participantCountTotal",
        dataType: "integer",
        locationRef: { form: "Form 5500", schedule: null, part: "Part II", line: "Line 6g", instructionsYear: 2024 },
        exportGroup: "allYears",
        exportOrder: 50,
        constraints: { min: 0 },
        sourceMap: { notes: "Stubbed in v0.7.0 unless source metadata provides a value." }
      }
    ];
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
      ingestionTimestamp: source.ingestionTimestamp || new Date().toISOString()
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
    const orderedKeys = [mapping.pdfUrl, mapping.detailUrl].filter(Boolean);
    orderedKeys.push(...Object.keys(rowObject));

    for (const key of orderedKeys) {
      const value = toText(rowObject[key]);
      if (!value) {
        continue;
      }
      if (/^https?:\/\//i.test(value) && (/\.pdf(\?|#|$)/i.test(value) || normalizeHeaderKey(key).includes("pdf"))) {
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
    comparePreferredFiling,
    createExportFileName,
    detectEfastColumns,
    getDefaultSchemaRegistry,
    getFieldText,
    ingestEfastCsv,
    normalizeFieldValue,
    parseCsv,
    quoteCsvCell,
    toCsv
  };
});
