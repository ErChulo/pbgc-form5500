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

  function isLikelyPlaceholderValue(value) {
    const text = sanitizeExtractedText(value);
    if (!text) {
      return false;
    }

    if (/ABCDEFGHI/i.test(text)) {
      return true;
    }

    if (/^123\.12%?$/.test(text.replace(/\s+/g, ""))) {
      return true;
    }

    const compactDigits = text.replace(/\D/g, "");
    if (compactDigits.length >= 9 && /(0123456789|1234567890|123456789012|012345678901)/.test(compactDigits)) {
      return true;
    }

    if (compactDigits.length >= 6 && /^(\d)\1+$/.test(compactDigits)) {
      return true;
    }

    const compactLetters = text.replace(/[^A-Za-z]/g, "");
    if (compactLetters.length >= 6 && /^([A-Za-z])\1+$/i.test(compactLetters)) {
      return true;
    }

    return false;
  }

  function isLikelyPlaceholderMatch(matchDetails) {
    if (!matchDetails) {
      return false;
    }

    if (isLikelyPlaceholderValue(matchDetails.value)) {
      return true;
    }

    const excerpt = sanitizeExtractedText(matchDetails.excerpt);
    if (!excerpt) {
      return false;
    }

    if (/ABCDEFGHI/i.test(excerpt)) {
      return true;
    }

    const compactDigits = excerpt.replace(/\D/g, "");
    if (compactDigits.length >= 9 && /(0123456789|1234567890|123456789012|012345678901)/.test(compactDigits)) {
      return true;
    }

    if (
      /^123(?:\.12)?%?$/.test(String(matchDetails.value || "").replace(/\s+/g, "")) &&
      /15[^]*?123\.12\s*%/i.test(excerpt)
    ) {
      return true;
    }

    return false;
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
      if (/schedule\s+[a-z]+.*form 5500|form 5500 \(\d{4}\)|this form is open to public inspection/i.test(line)) {
        continue;
      }
      if (/table of contents|statements?\s+of\s+net assets|statements?\s+of\s+changes?\s+in\s+net assets|statement\s+of\s+accumulated\s+plan benefits/i.test(line)) {
        continue;
      }
      const matches = line.match(/\(?-?\$?\d[\d,]*(?:\.\d+)?%?\)?(?![A-Za-z])/g);
      if (matches && matches[pairIndex]) {
        return { value: matches[pairIndex], sourceLabel: aliases[0], sourcePage: null, excerpt: line };
      }
    }
    return null;
  }

  function findScheduleLinePair(joinedText, lineCode, labelPattern, pairIndex) {
    const numberPattern = "[-(]?(?:\\$)?\\d[\\d,]*(?:\\.\\d+)?(?:\\s*%?)?\\)?";
    const regex = new RegExp(
      `(?:^|\\n)${lineCode}\\s+${labelPattern}[^\\n]*?${lineCode}\\s+(${numberPattern})\\s+(${numberPattern})`,
      "i"
    );
    const match = joinedText.match(regex);
    if (!match || !match[pairIndex + 1]) {
      return null;
    }
    return {
      value: sanitizeExtractedText(match[pairIndex + 1]),
      sourceLabel: lineCode,
      sourcePage: null,
      excerpt: sanitizeExtractedText(match[0]).slice(0, 500)
    };
  }

  function isNumericType(dataType) {
    return ["integer", "decimal", "currency", "percent"].includes(dataType);
  }

  function getSupportedSchedules(definition) {
    if (Array.isArray(definition.supportedSchedules) && definition.supportedSchedules.length) {
      return definition.supportedSchedules.map((schedule) => String(schedule || "").toUpperCase());
    }
    const requiredSchedule = definition.locationRef && definition.locationRef.schedule
      ? String(definition.locationRef.schedule).toUpperCase()
      : null;
    return requiredSchedule ? [requiredSchedule] : [];
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

  function findLastMatch(text, regex) {
    const globalRegex = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
    let last = null;
    let match = globalRegex.exec(text);
    while (match) {
      last = match;
      match = globalRegex.exec(text);
    }
    return last;
  }

  function findSummaryFooter(joinedText) {
    const match = findLastMatch(
      joinedText,
      /Form 5500 \(\d{4}\) v\.[^]*?(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(?:X\s+){1,6}(.+?)Filed with authorized\/valid electronic signature\./i
    );
    if (!match) {
      return null;
    }
    return {
      beginDate: match[1],
      endDate: match[2],
      summaryText: sanitizeExtractedText(match[3]),
      excerpt: sanitizeExtractedText(match[0]).slice(0, 600)
    };
  }

  function parseBasicPlanInfoFromSummary(joinedText) {
    const footer = findSummaryFooter(joinedText);
    if (!footer) {
      return {};
    }

    const summary = footer.summaryText;
    const match = summary.match(
      /(.+?)\s+(\d{3})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}-?\d{7})\s+(.+?)\s+(\d{3}-\d{3}-\d{4}|\d{10})\s+(.+?)\s+(\d{6})$/i
    );
    if (!match) {
      return {
        planYearBeginDate: { value: footer.beginDate, sourceLabel: "summary-footer", sourcePage: 1, excerpt: footer.excerpt },
        planYearEndDate: { value: footer.endDate, sourceLabel: "summary-footer", sourcePage: 1, excerpt: footer.excerpt }
      };
    }

    return {
      planYearBeginDate: { value: footer.beginDate, sourceLabel: "summary-footer", sourcePage: 1, excerpt: footer.excerpt },
      planYearEndDate: { value: footer.endDate, sourceLabel: "summary-footer", sourcePage: 1, excerpt: footer.excerpt },
      planName: { value: sanitizeExtractedText(match[1]), sourceLabel: "summary-footer", sourcePage: 1, excerpt: footer.excerpt },
      planNumber: { value: match[2], sourceLabel: "summary-footer", sourcePage: 1, excerpt: footer.excerpt },
      sponsorEmployerIdentificationNumber: {
        value: match[4],
        sourceLabel: "summary-footer",
        sourcePage: 1,
        excerpt: footer.excerpt
      },
      sponsorName: { value: sanitizeExtractedText(match[5]), sourceLabel: "summary-footer", sourcePage: 1, excerpt: footer.excerpt },
      sponsorAddress: {
        value: sanitizeExtractedText(match[7]),
        sourceLabel: "summary-footer",
        sourcePage: 1,
        excerpt: footer.excerpt
      },
      businessCode: { value: match[8], sourceLabel: "summary-footer", sourcePage: 1, excerpt: footer.excerpt }
    };
  }

  function findTrailingLineCodeNumber(joinedText, labelPattern, lineCode) {
    const match = joinedText.match(new RegExp(`${labelPattern}[^]*?${lineCode}\\s+(-?\\d[\\d,]*)`, "i"));
    if (!match) {
      return null;
    }
    return {
      value: sanitizeExtractedText(match[1]),
      sourceLabel: lineCode,
      sourcePage: null,
      excerpt: sanitizeExtractedText(match[0]).slice(0, 400)
    };
  }

  function findTrailingLineCodeValue(joinedText, labelPattern, lineCode, valuePattern) {
    const match = joinedText.match(new RegExp(`${labelPattern}[^]*?${lineCode}\\s+(${valuePattern})`, "i"));
    if (!match) {
      return null;
    }
    return {
      value: sanitizeExtractedText(match[1]),
      sourceLabel: lineCode,
      sourcePage: null,
      excerpt: sanitizeExtractedText(match[0]).slice(0, 500)
    };
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

    const summaryMatches = parseBasicPlanInfoFromSummary(prepared.joinedText);
    const planYearDates = detectPlanYearDates(prepared.joinedText);
    rawMatches.planYearBeginDate =
      summaryMatches.planYearBeginDate || (planYearDates.begin
        ? { value: planYearDates.begin, sourceLabel: "detected-plan-year", sourcePage: null, excerpt: planYearDates.begin }
        : null);
    rawMatches.planYearEndDate =
      summaryMatches.planYearEndDate || (planYearDates.end
        ? { value: planYearDates.end, sourceLabel: "detected-plan-year", sourcePage: null, excerpt: planYearDates.end }
        : null);
    rawMatches.planName = summaryMatches.planName || findTextValue(prepared.lines, ["name of plan"]);
    rawMatches.planNumber =
      summaryMatches.planNumber ||
      findSingleValue(prepared.joinedText, ["three-digit plan number \\(pn\\)", "plan number \\(pn\\)", "plan number"], "\\d{3}");
    rawMatches.sponsorEmployerIdentificationNumber =
      summaryMatches.sponsorEmployerIdentificationNumber ||
      findSingleValue(prepared.joinedText, ["employer identification number \\(ein\\)", "employer identification number"], "\\d{2}-?\\d{7}");
    rawMatches.sponsorName =
      summaryMatches.sponsorName ||
      findTextValue(prepared.lines, ["plan sponsor's name", "plan sponsor’s name", "name of plan sponsor"]);
    rawMatches.sponsorAddress = summaryMatches.sponsorAddress || findTextValue(prepared.lines, ["mailing address"]);
    rawMatches.businessCode =
      summaryMatches.businessCode ||
      findSingleValue(prepared.joinedText, ["business code \\(see instructions\\)", "business code"], "\\d{6}");
    rawMatches.participantCountBeginningOfYear = findTrailingLineCodeNumber(
      prepared.joinedText,
      "5\\s+Total number of participants at the beginning of the plan year",
      "5"
    ) || findSingleValue(prepared.joinedText, ["participants at the beginning of the plan year"], "\\d[\\d,]*");
    rawMatches.retiredParticipantsReceivingBenefits = findTrailingLineCodeNumber(
      prepared.joinedText,
      "Retired or separated participants receiving benefits",
      "6b"
    ) || findSingleValue(prepared.joinedText, ["retired or separated participants receiving benefits"], "\\d[\\d,]*");
    rawMatches.separatedParticipantsEntitledToBenefits = findTrailingLineCodeNumber(
      prepared.joinedText,
      "Other retired or separated participants entitled to future benefits|Separated participants entitled to future benefits",
      "6c"
    ) || findSingleValue(prepared.joinedText, ["separated participants entitled to future benefits"], "\\d[\\d,]*");
    rawMatches.deceasedParticipantsBeneficiaries = findTrailingLineCodeNumber(
      prepared.joinedText,
      "Deceased participants whose beneficiaries are receiving or are entitled to receive benefits",
      "6e"
    ) || findSingleValue(
      prepared.joinedText,
      ["deceased participants whose beneficiaries are receiving or are entitled to receive benefits"],
      "\\d[\\d,]*"
    );
    rawMatches.participantCountTotal = findTrailingLineCodeNumber(
      prepared.joinedText,
      "Total\\. Add lines 6d and 6e",
      "6f"
    ) || findSingleValue(prepared.joinedText, ["total number of participants"], "\\d[\\d,]*");
    rawMatches.assetsBeginningOfYear = findScheduleLinePair(prepared.joinedText, "1f", "Total assets", 0);
    rawMatches.assetsEndOfYear = findScheduleLinePair(prepared.joinedText, "1f", "Total assets", 1);
    rawMatches.liabilitiesBeginningOfYear = findScheduleLinePair(prepared.joinedText, "1k", "Total liabilities", 0);
    rawMatches.liabilitiesEndOfYear = findScheduleLinePair(prepared.joinedText, "1k", "Total liabilities", 1);
    rawMatches.netAssetsBeginningOfYear = findScheduleLinePair(prepared.joinedText, "1l", "Net assets", 0);
    rawMatches.netAssetsEndOfYear = findScheduleLinePair(prepared.joinedText, "1l", "Net assets", 1);
    rawMatches.scheduleHAccountantOpinion = findTextValue(prepared.lines, ["accountant's opinion", "opinion"]);
    rawMatches.fundingTargetAttainmentPercent =
      findTrailingLineCodeValue(prepared.joinedText, "Funding target attainment percentage", "14", "-?\\d[\\d,]*(?:\\.\\d+)?\\s*%?") ||
      findSingleValue(prepared.joinedText, ["funding target attainment percentage", "line 27"], "\\d[\\d.,]*%?");

    Object.keys(rawMatches).forEach((fieldId) => {
      rawValues[fieldId] =
        rawMatches[fieldId] && !isLikelyPlaceholderMatch(rawMatches[fieldId]) ? rawMatches[fieldId].value : null;
    });

    const fieldMap = {};
    schemaRegistry.forEach((definition) => {
      const supportedSchedules = getSupportedSchedules(definition);
      const matchDetails = rawMatches[definition.fieldId] || null;
      if (supportedSchedules.length && !supportedSchedules.some((schedule) => detectedSchedules.has(schedule))) {
        fieldMap[definition.fieldId] = normalizeFieldValue(null, definition.dataType);
        exceptions.push({
          fieldId: definition.fieldId,
          code: "schedule-not-present",
          message: `Schedule ${supportedSchedules.join(" or ")} is not present in this filing package.`,
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
        const maskedNumericEvidence = isNumericType(definition.dataType) && matchDetails && isLikelyPlaceholderMatch(matchDetails);
        exceptions.push({
          fieldId: definition.fieldId,
          code: maskedNumericEvidence ? "masked-numeric-evidence" : fieldValue.parseStatus === "failed" ? "parse-failed" : "missing",
          message:
            maskedNumericEvidence
              ? "The filing contains stand-in or masked numeric evidence for this field, so it does not count as validated numeric extraction."
              : fieldValue.parseStatus === "failed"
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
