(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500FieldMapper = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function cleanLine(line) {
    return String(line || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function prepareText(documentText) {
    const lines = String(documentText || "")
      .split(/\r?\n/)
      .map(cleanLine)
      .filter(Boolean);

    return {
      lines,
      joinedText: lines.join("\n"),
      flattenedText: lines.join(" ").replace(/[ ]+/g, " ")
    };
  }

  function sanitizeExtractedText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isBoilerplateLine(line) {
    return /(annual return\/report|employee benefit plan|for paperw|department of labor|internal revenue service)/i.test(line);
  }

  function findTextValue(lines, aliases) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const alias of aliases) {
        const regex = new RegExp(`${alias}\\s*[:\\-]?\\s*(.+)$`, "i");
        const inlineMatch = line.match(regex);
        if (inlineMatch && inlineMatch[1] && !isBoilerplateLine(inlineMatch[1])) {
          return { value: sanitizeExtractedText(inlineMatch[1]), sourceLabel: alias, sourcePage: null, excerpt: line };
        }

        if (new RegExp(alias, "i").test(line)) {
          for (let lookahead = 1; lookahead <= 2; lookahead += 1) {
            const candidate = lines[index + lookahead];
            if (!candidate || isBoilerplateLine(candidate) || new RegExp(alias, "i").test(candidate)) {
              continue;
            }
            return { value: sanitizeExtractedText(candidate), sourceLabel: alias, sourcePage: null, excerpt: candidate };
          }
        }
      }
    }
    return null;
  }

  function findNumberFromLinePair(lines, aliases, pairIndex) {
    for (const line of lines) {
      if (!aliases.some((alias) => new RegExp(alias, "i").test(line))) {
        continue;
      }
      const matches = line.match(/\(?-?\$?\d[\d,]*(?:\.\d+)?%?\)?/g);
      if (matches && matches[pairIndex]) {
        return { value: matches[pairIndex], sourceLabel: aliases[0], sourcePage: null, excerpt: line };
      }
    }
    return null;
  }

  function findSingleValue(joinedText, aliases, valuePattern) {
    for (const alias of aliases) {
      const regex = new RegExp(`${alias}\\s*[:\\-]?\\s*(${valuePattern})`, "i");
      const match = joinedText.match(regex);
      if (match) {
        return { value: sanitizeExtractedText(match[1]), sourceLabel: alias, sourcePage: null, excerpt: match[0] };
      }
    }
    return null;
  }

  function detectPlanYearDates(joinedText) {
    let match = joinedText.match(/beginning\s+(\d{1,2}[/-]\d{1,2}[/-]\d{4}).*?(?:and )?ending\s+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/is);
    if (match) {
      return { begin: match[1], end: match[2] };
    }

    match = joinedText.match(/plan year.*?(\d{1,2}[/-]\d{1,2}[/-]\d{4}).*?(\d{1,2}[/-]\d{1,2}[/-]\d{4})/is);
    if (match) {
      return { begin: match[1], end: match[2] };
    }

    return { begin: null, end: null };
  }

  function parseFilingKind(flattenedText) {
    const text = flattenedText.toLowerCase();
    const amended = text.includes("amended return") || text.includes("amended annual return");
    const final = text.includes("final return") || text.includes("final filing");
    if (amended && final) {
      return "amended final";
    }
    if (amended) {
      return "amended";
    }
    if (final) {
      return "final";
    }
    return "original";
  }

  function mapDocumentFields(input) {
    const source = input || {};
    const normalizeFieldValue = source.normalizeFieldValue;
    if (typeof normalizeFieldValue !== "function") {
      throw new Error("mapDocumentFields requires normalizeFieldValue");
    }

    const prepared = prepareText(source.documentText);
    const schemaRegistry = source.schemaRegistry || [];
    const detectedSchedules = new Set(
      ((source.context && Array.isArray(source.context.schedules) ? source.context.schedules : []) || [])
        .map((schedule) => String(schedule || "").toUpperCase())
    );
    const evidence = [];
    const exceptions = [];
    const rawValues = {};
    const rawMatches = {};

    const planYearDates = detectPlanYearDates(prepared.joinedText);
    rawValues.planYearBeginDate = planYearDates.begin;
    rawValues.planYearEndDate = planYearDates.end;
    rawMatches.planName = findTextValue(prepared.lines, ["name of plan", "plan name"]);
    rawMatches.planNumber = findSingleValue(prepared.joinedText, ["plan number", "\\bpn\\b"], "[A-Z0-9-]{1,12}");
    rawMatches.sponsorEmployerIdentificationNumber = findSingleValue(
      prepared.joinedText,
      ["employer identification number", "\\bein\\b"],
      "\\d{2}-?\\d{7}"
    );
    rawMatches.sponsorName = findTextValue(prepared.lines, ["name of plan sponsor", "plan sponsor"]);
    rawMatches.sponsorAddress = findTextValue(prepared.lines, ["mailing address", "address of plan sponsor"]);
    rawMatches.businessCode = findSingleValue(
      prepared.joinedText,
      ["business code", "principal business activity code"],
      "\\d{6}"
    );
    rawMatches.participantCountBeginningOfYear = findSingleValue(
      prepared.joinedText,
      ["participants at the beginning of the plan year", "line 6a"],
      "\\d[\\d,]*"
    );
    rawMatches.retiredParticipantsReceivingBenefits = findSingleValue(
      prepared.joinedText,
      ["retired or separated participants receiving benefits", "line 6d"],
      "\\d[\\d,]*"
    );
    rawMatches.separatedParticipantsEntitledToBenefits = findSingleValue(
      prepared.joinedText,
      ["separated participants entitled to future benefits", "line 6e"],
      "\\d[\\d,]*"
    );
    rawMatches.deceasedParticipantsBeneficiaries = findSingleValue(
      prepared.joinedText,
      ["deceased participants whose beneficiaries are receiving or are entitled to receive benefits", "line 6f"],
      "\\d[\\d,]*"
    );
    rawMatches.participantCountTotal = findSingleValue(
      prepared.joinedText,
      ["total number of participants", "line 6g"],
      "\\d[\\d,]*"
    );
    rawMatches.assetsBeginningOfYear = findNumberFromLinePair(prepared.lines, ["total assets", "line 1a"], 0);
    rawMatches.assetsEndOfYear = findNumberFromLinePair(prepared.lines, ["total assets", "line 1b"], 1);
    rawMatches.liabilitiesBeginningOfYear = findNumberFromLinePair(prepared.lines, ["total liabilities", "line 2a"], 0);
    rawMatches.liabilitiesEndOfYear = findNumberFromLinePair(prepared.lines, ["total liabilities", "line 2b"], 1);
    rawMatches.netAssetsBeginningOfYear = findNumberFromLinePair(prepared.lines, ["net assets", "line 3a"], 0);
    rawMatches.netAssetsEndOfYear = findNumberFromLinePair(prepared.lines, ["net assets", "line 3b"], 1);
    rawMatches.scheduleHAccountantOpinion = findTextValue(prepared.lines, ["accountant's opinion", "opinion"]);
    rawMatches.fundingTargetAttainmentPercent = findSingleValue(
      prepared.joinedText,
      ["funding target attainment percentage", "line 27"],
      "\\d[\\d.,]*%?"
    );

    Object.keys(rawMatches).forEach((fieldId) => {
      rawValues[fieldId] = rawMatches[fieldId] ? rawMatches[fieldId].value : null;
    });

    const fieldMap = {};
    schemaRegistry.forEach((definition) => {
      const requiredSchedule = definition.locationRef && definition.locationRef.schedule
        ? String(definition.locationRef.schedule).toUpperCase()
        : null;
      const matchDetails = rawMatches[definition.fieldId] || null;
      if (requiredSchedule && !detectedSchedules.has(requiredSchedule)) {
        fieldMap[definition.fieldId] = normalizeFieldValue(null, definition.dataType);
        exceptions.push({
          fieldId: definition.fieldId,
          code: "schedule-not-present",
          message: `Schedule ${requiredSchedule} is not present in this filing package.`,
          sourcePage: null,
          sourceLabel: definition.name
        });
        return;
      }

      const rawValue = rawValues[definition.fieldId] == null ? null : rawValues[definition.fieldId];
      const fieldValue = normalizeFieldValue(rawValue, definition.dataType);
      fieldMap[definition.fieldId] = fieldValue;
      if (fieldValue.parseStatus === "parsed") {
        evidence.push({
          fieldId: definition.fieldId,
          status: "parsed",
          sourcePage: matchDetails && matchDetails.sourcePage != null ? matchDetails.sourcePage : null,
          sourceLabel: matchDetails && matchDetails.sourceLabel ? matchDetails.sourceLabel : definition.name,
          excerpt: matchDetails && matchDetails.excerpt ? matchDetails.excerpt : rawValue
        });
      } else {
        exceptions.push({
          fieldId: definition.fieldId,
          code: fieldValue.parseStatus === "failed" ? "parse-failed" : "missing",
          message:
            fieldValue.parseStatus === "failed"
              ? fieldValue.parseNotes || "Parser could not normalize the extracted value."
              : "No value was detected in the extracted PDF text.",
          sourcePage: matchDetails && matchDetails.sourcePage != null ? matchDetails.sourcePage : null,
          sourceLabel: matchDetails && matchDetails.sourceLabel ? matchDetails.sourceLabel : definition.name
        });
      }
    });

    return {
      fieldMap,
      evidence,
      exceptions,
      filingKind: parseFilingKind(prepared.flattenedText)
    };
  }

  return {
    mapDocumentFields
  };
});
