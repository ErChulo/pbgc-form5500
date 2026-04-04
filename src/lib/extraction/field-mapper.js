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
        const regex = new RegExp(alias + "\\s*[:\\-]?\\s*(.+)$", "i");
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
    const patterns = [
      new RegExp("(?:^|\\n)" + lineCode + "\\s+" + labelPattern + "[^\\n]*?" + lineCode + "\\s+(" + numberPattern + ")\\s+(" + numberPattern + ")", "i"),
      new RegExp("(?:^|\\n)(?:" + labelPattern + ")[^\\n]*?" + lineCode + "\\s+(" + numberPattern + ")\\s+(" + numberPattern + ")", "i")
    ];
    for (const regex of patterns) {
      const match = joinedText.match(regex);
      if (match && match[pairIndex + 1]) {
        return {
          value: sanitizeExtractedText(match[pairIndex + 1]),
          sourceLabel: lineCode,
          sourcePage: null,
          excerpt: sanitizeExtractedText(match[0]).slice(0, 500)
        };
      }
    }
    return null;
  }

  function findScheduleLinePairInLines(lines, lineCode, aliases, pairIndex) {
    const numberPattern = /\(?-?(?:\$)?\d[\d,]*(?:\.\d+)?(?:\s*%?)?\)?(?![A-Za-z])/g;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!aliases.some((alias) => new RegExp(alias, "i").test(line))) {
        continue;
      }
      for (let lookahead = 1; lookahead <= 2; lookahead += 1) {
        const candidate = lines[index + lookahead];
        if (!candidate || !new RegExp("\\b" + lineCode + "\\b", "i").test(candidate)) {
          continue;
        }
        const matches = candidate.match(numberPattern);
        if (matches && matches[pairIndex]) {
          return {
            value: sanitizeExtractedText(matches[pairIndex]),
            sourceLabel: lineCode,
            sourcePage: null,
            excerpt: (sanitizeExtractedText(line) + " " + sanitizeExtractedText(candidate)).slice(0, 500)
          };
        }
      }
    }
    return null;
  }

  function findLinePairValue(lines, aliases, pairIndex, sourceLabel, excludePattern) {
    const numberPattern = /\(?-?(?:\$)?\d[\d,]*(?:\.\d+)?\)?(?![A-Za-z])/g;
    for (const line of lines) {
      if (!aliases.some((alias) => new RegExp(alias, "i").test(line))) {
        continue;
      }
      if (excludePattern && excludePattern.test(line)) {
        continue;
      }
      const matches = line.match(numberPattern);
      if (matches && matches[pairIndex]) {
        return {
          value: sanitizeExtractedText(matches[pairIndex]),
          sourceLabel: sourceLabel || aliases[0],
          sourcePage: null,
          excerpt: sanitizeExtractedText(line).slice(0, 500)
        };
      }
    }
    return null;
  }

  function findFinancialStatementPair(joinedText, rowLabelPattern, pairIndex) {
    const numberPattern = "[-(]?(?:\\$)?\\d[\\d,]*(?:\\.\\d+)?\\)?";
    const regex = new RegExp(
      "statements? of net assets available for (?:plan )?benefits[^]{0,1200}?(?:assets\\b|investments?,? at fair value)[^]{0,1200}?" +
        rowLabelPattern +
        "\\s+(" +
        numberPattern +
        ")\\s*\\$?\\s+(" +
        numberPattern +
        ")",
      "i"
    );
    const match = joinedText.match(regex);
    if (!match || !match[pairIndex + 1]) {
      return null;
    }
    return {
      value: sanitizeExtractedText(match[pairIndex + 1]),
      sourceLabel: "financial-statements",
      sourcePage: null,
      excerpt: sanitizeExtractedText(match[0]).slice(0, 500)
    };
  }

  function findFinancialStatementRowPair(joinedText, rowLabelPattern, pairIndex, options) {
    const settings = options || {};
    const numberPattern = "[-(]?(?:\\$)?\\d[\\d,]*(?:\\.\\d+)?\\)?";
    const prefixPattern =
      settings.prefixPattern ||
      "statements? of (?:net assets available for (?:plan )?benefits|changes? in net assets available for (?:plan )?benefits)";
    const regex = new RegExp(
      prefixPattern +
        "[^]{0,1800}?" +
        rowLabelPattern +
        "\\s+(" +
        numberPattern +
        ")\\s*\\$?\\s+(" +
        numberPattern +
        ")",
      "i"
    );
    const match = joinedText.match(regex);
    if (!match || !match[pairIndex + 1]) {
      return null;
    }
    return {
      value: sanitizeExtractedText(match[pairIndex + 1]),
      sourceLabel: settings.sourceLabel || "financial-statements",
      sourcePage: null,
      excerpt: sanitizeExtractedText(match[0]).slice(0, 500)
    };
  }

  function findActuarialAttachmentValue(joinedText, labelPattern) {
    const regex = new RegExp(labelPattern + "[^\\d-]*(\\(?-?(?:\\$)?\\d[\\d,]*(?:\\.\\d+)?\\)?)", "i");
    const match = joinedText.match(regex);
    if (!match || !match[1]) {
      return null;
    }
    return {
      value: sanitizeExtractedText(match[1]),
      sourceLabel: "actuarial-attachment",
      sourcePage: null,
      excerpt: sanitizeExtractedText(match[0]).slice(0, 500)
    };
  }

  function computeFinancialStatementAssetTotal(pageText, pairIndex, sourcePage) {
    const statementMatch = sanitizeExtractedText(pageText).match(
      /statements? of net assets available for (?:plan )?benefits[^]{0,800}?\bassets\b\s+([^]*?)net assets available for (?:plan )?benefits\s+[-(]?(?:\$)?\d[\d,]*(?:\.\d+)?\)?\s*\$?\s+[-(]?(?:\$)?\d[\d,]*(?:\.\d+)?\)?/i
    );
    if (!statementMatch || !statementMatch[1]) {
      return null;
    }

    const assetSection = sanitizeExtractedText(statementMatch[1]);
    const rowRegex = /([A-Za-z][A-Za-z ,.'&()/-]*?)\s+(\(?-?(?:\$)?\d[\d,]*(?:\.\d+)?\)?)\s*\$?\s+(\(?-?(?:\$)?\d[\d,]*(?:\.\d+)?\)?)(?!\s*%)/g;
    let match = rowRegex.exec(assetSection);
    let total = 0;
    let matchedRows = 0;
    while (match) {
      const label = sanitizeExtractedText(match[1]);
      if (label && !/^(?:page|see notes|december|june|april|\d{4})$/i.test(label)) {
        const rawValue = sanitizeExtractedText(match[pairIndex + 2]);
        const normalizedValue = rawValue
          .replace(/\$/g, "")
          .replace(/,/g, "")
          .replace(/\s+/g, "");
        const negative = /^\(.*\)$/.test(normalizedValue) || normalizedValue.startsWith("-");
        const digits = normalizedValue.replace(/[()\-]/g, "");
        if (/^\d+(?:\.\d+)?$/.test(digits)) {
          total += negative ? -Number(digits) : Number(digits);
          matchedRows += 1;
        }
      }
      match = rowRegex.exec(assetSection);
    }

    if (!matchedRows) {
      return null;
    }

    return {
      value: String(total),
      sourceLabel: "financial-statements-assets",
      sourcePage: sourcePage == null ? null : sourcePage,
      excerpt: assetSection.slice(0, 500)
    };
  }

  function findFinancialStatementAssetTotal(joinedText, pages, pairIndex) {
    const pageList = Array.isArray(pages) ? pages : [];
    for (const page of pageList) {
      const matched = computeFinancialStatementAssetTotal(page && page.text ? page.text : "", pairIndex, page && page.pageNumber);
      if (matched) {
        return matched;
      }
    }
    return computeFinancialStatementAssetTotal(joinedText, pairIndex, null);
  }

  function findAccountantOpinion(joinedText) {
    const text = sanitizeExtractedText(joinedText);
    if (!text) {
      return null;
    }

    const disclaimerMatch = text.match(/did not express an opinion on the (?:\d{4}\s+)?financial statements/i);
    if (disclaimerMatch) {
      return {
        value: "disclaimer of opinion",
        sourceLabel: "auditor-report",
        sourcePage: null,
        excerpt: sanitizeExtractedText(disclaimerMatch[0]).slice(0, 500)
      };
    }

    const unmodifiedMatch = text.match(/in our opinion[^.]{0,500}?presented fairly,? in all material respects/i);
    if (unmodifiedMatch) {
      return {
        value: "unmodified opinion",
        sourceLabel: "auditor-report",
        sourcePage: null,
        excerpt: sanitizeExtractedText(unmodifiedMatch[0]).slice(0, 500)
      };
    }

    return null;
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
      const regex = new RegExp(alias + "\\s*[:\\-]?\\s*(" + valuePattern + ")", "i");
      const match = joinedText.match(regex);
      if (match) {
        return { value: sanitizeExtractedText(match[1]), sourceLabel: alias, sourcePage: null, excerpt: match[0] };
      }
    }
    return null;
  }

  function findBooleanValue(joinedText, aliases) {
    for (const alias of aliases) {
      const regex = new RegExp(alias + "\\s*[:\\-]?\\s*(yes|no)\\b", "i");
      const match = joinedText.match(regex);
      if (match) {
        return {
          value: sanitizeExtractedText(match[1]),
          sourceLabel: alias,
          sourcePage: null,
          excerpt: sanitizeExtractedText(match[0]).slice(0, 300)
        };
      }
    }
    return null;
  }

  function findLastMatch(text, regex) {
    const globalRegex = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
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
      planEffectiveDate: { value: match[3], sourceLabel: "summary-footer", sourcePage: 1, excerpt: footer.excerpt },
      sponsorEmployerIdentificationNumber: {
        value: match[4],
        sourceLabel: "summary-footer",
        sourcePage: 1,
        excerpt: footer.excerpt
      },
      sponsorName: { value: sanitizeExtractedText(match[5]), sourceLabel: "summary-footer", sourcePage: 1, excerpt: footer.excerpt },
      sponsorTelephoneNumber: {
        value: sanitizeExtractedText(match[6]),
        sourceLabel: "summary-footer",
        sourcePage: 1,
        excerpt: footer.excerpt
      },
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
    const match = joinedText.match(new RegExp("(?:" + labelPattern + ")[^]*?" + lineCode + "\\s+(-?\\d[\\d,]*)", "i"));
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

  function findFirstTrailingLineCodeNumber(joinedText, variants) {
    for (const variant of variants) {
      const match = findTrailingLineCodeNumber(joinedText, variant.labelPattern, variant.lineCode);
      if (match) {
        return match;
      }
    }
    return null;
  }

  function findTrailingLineCodeValue(joinedText, labelPattern, lineCode, valuePattern) {
    const match = joinedText.match(new RegExp("(?:" + labelPattern + ")[^]*?" + lineCode + "\\s+(" + valuePattern + ")", "i"));
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
    const pages = Array.isArray(source.pages) ? source.pages : [];
    const schemaRegistry = source.schemaRegistry || [];
    const detectedSchedules = new Set(
      ((source.context && Array.isArray(source.context.schedules) ? source.context.schedules : []) || [])
        .map((schedule) => String(schedule || "").toUpperCase())
    );
    const evidence = [];
    const exceptions = [];
    const rawValues = {};
    const rawMatches = {};
    const conflicts = [];

    function inferSourceType(definition, matchDetails) {
      const sourceLabel = String(matchDetails && matchDetails.sourceLabel ? matchDetails.sourceLabel : "").toLowerCase();
      if (sourceLabel.includes("financial-statements")) {
        return "financial-statement";
      }
      if (sourceLabel.includes("actuarial")) {
        return "actuarial-attachment";
      }
      if (definition && definition.locationRef && definition.locationRef.form === "Attachment") {
        return "other-attachment";
      }
      if (definition && definition.locationRef && definition.locationRef.schedule) {
        return "schedule";
      }
      return "main-form";
    }

    function registerConflict(fieldId, preferredMatch, alternateMatch) {
      if (!preferredMatch || !alternateMatch) {
        return;
      }
      if (isLikelyPlaceholderMatch(preferredMatch) || isLikelyPlaceholderMatch(alternateMatch)) {
        return;
      }
      if (sanitizeExtractedText(preferredMatch.value) === sanitizeExtractedText(alternateMatch.value)) {
        return;
      }
      conflicts.push({
        fieldId,
        preferredMatch,
        alternateMatch
      });
    }

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
    rawMatches.planEffectiveDate =
      summaryMatches.planEffectiveDate ||
      findSingleValue(prepared.joinedText, ["effective date of plan", "date effective"], "\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}");
    rawMatches.planNumber =
      summaryMatches.planNumber ||
      findSingleValue(prepared.joinedText, ["three-digit plan number \\(pn\\)", "plan number \\(pn\\)", "plan number"], "\\d{3}");
    rawMatches.sponsorEmployerIdentificationNumber =
      summaryMatches.sponsorEmployerIdentificationNumber ||
      findSingleValue(prepared.joinedText, ["employer identification number \\(ein\\)", "employer identification number"], "\\d{2}-?\\d{7}");
    rawMatches.sponsorName =
      summaryMatches.sponsorName ||
      findTextValue(prepared.lines, ["plan sponsor's name", "plan sponsor’s name", "name of plan sponsor"]);
    rawMatches.sponsorTelephoneNumber =
      summaryMatches.sponsorTelephoneNumber ||
      findSingleValue(
        prepared.joinedText,
        ["telephone number of plan sponsor", "plan sponsor telephone number", "telephone number"],
        "\\(?\\d{3}\\)?[- ]?\\d{3}[- ]?\\d{4}"
      );
    rawMatches.sponsorAddress = summaryMatches.sponsorAddress || findTextValue(prepared.lines, ["mailing address"]);
    rawMatches.businessCode =
      summaryMatches.businessCode ||
      findSingleValue(prepared.joinedText, ["business code \\(see instructions\\)", "business code"], "\\d{6}");
    rawMatches.planAdministratorSameAsSponsor =
      /same as plan sponsor/i.test(prepared.joinedText)
        ? {
            value: "yes",
            sourceLabel: "plan-administrator-same-as-sponsor",
            sourcePage: null,
            excerpt: "same as plan sponsor"
          }
        : findSingleValue(prepared.joinedText, ["plan administrator same as sponsor"], "yes|no");
    rawMatches.insuranceInForce = findBooleanValue(prepared.joinedText, [
      "insurance in force",
      "schedule a[^\\n]*insurance",
      "benefits provided by an insurance carrier"
    ]);
    rawMatches.serviceProviderCompensationIndirect = findBooleanValue(prepared.joinedText, [
      "indirect compensation",
      "service provider compensation indirect",
      "received indirect compensation"
    ]);
    rawMatches.reportableTransactionsPresent = findBooleanValue(prepared.joinedText, [
      "reportable transactions",
      "nonexempt transaction",
      "schedule g[^\\n]*reportable"
    ]);
    rawMatches.participantCountBeginningOfYear = findFirstTrailingLineCodeNumber(prepared.joinedText, [
      { labelPattern: "5\\s+Total number of participants at the beginning of the plan year", lineCode: "5" },
      { labelPattern: "Total number of participants at the beginning of the plan year", lineCode: "6a" }
    ]) || findSingleValue(prepared.joinedText, ["participants at the beginning of the plan year"], "\\d[\\d,]*");
    rawMatches.retiredParticipantsReceivingBenefits = findFirstTrailingLineCodeNumber(prepared.joinedText, [
      { labelPattern: "Retired or separated participants receiving benefits", lineCode: "6b" },
      { labelPattern: "Retired or separated participants receiving benefits", lineCode: "6d" }
    ]) || findSingleValue(prepared.joinedText, ["retired or separated participants receiving benefits"], "\\d[\\d,]*");
    rawMatches.separatedParticipantsEntitledToBenefits = findFirstTrailingLineCodeNumber(prepared.joinedText, [
      {
        labelPattern: "Other retired or separated participants entitled to future benefits|Separated participants entitled to future benefits",
        lineCode: "6c"
      },
      {
        labelPattern: "Other retired or separated participants entitled to future benefits|Separated participants entitled to future benefits",
        lineCode: "6e"
      }
    ]) || findSingleValue(
      prepared.joinedText,
      ["other retired or separated participants entitled to future benefits", "separated participants entitled to future benefits"],
      "\\d[\\d,]*"
    );
    rawMatches.deceasedParticipantsBeneficiaries = findFirstTrailingLineCodeNumber(prepared.joinedText, [
      {
        labelPattern: "Deceased participants whose beneficiaries are receiving or are entitled to receive benefits",
        lineCode: "6e"
      },
      {
        labelPattern: "Deceased participants whose beneficiaries are receiving or are entitled to receive benefits",
        lineCode: "6f"
      }
    ]) || findSingleValue(
      prepared.joinedText,
      ["deceased participants whose beneficiaries are receiving or are entitled to receive benefits"],
      "\\d[\\d,]*"
    );
    rawMatches.participantCountTotal = findFirstTrailingLineCodeNumber(prepared.joinedText, [
      { labelPattern: "Total\\. Add lines 6d and 6e", lineCode: "6f" },
      { labelPattern: "Total number of participants", lineCode: "6g" },
      { labelPattern: "Total\\. Add lines 6e and 6f", lineCode: "6g" }
    ]) || findSingleValue(prepared.joinedText, ["total number of participants"], "\\d[\\d,]*");
    const scheduleAssetsBeginningOfYear =
      findScheduleLinePair(prepared.joinedText, "1f", "Total assets", 0) ||
      findScheduleLinePairInLines(prepared.lines, "1f", ["Total assets"], 0);
    const scheduleAssetsEndOfYear =
      findScheduleLinePair(prepared.joinedText, "1f", "Total assets", 1) ||
      findScheduleLinePairInLines(prepared.lines, "1f", ["Total assets"], 1);
    rawMatches.assetsBeginningOfYear = scheduleAssetsBeginningOfYear;
    rawMatches.assetsEndOfYear = scheduleAssetsEndOfYear;
    rawMatches.liabilitiesBeginningOfYear =
      findScheduleLinePair(prepared.joinedText, "1k", "Total liabilities", 0) ||
      findScheduleLinePairInLines(prepared.lines, "1k", ["Total liabilities"], 0);
    rawMatches.liabilitiesEndOfYear =
      findScheduleLinePair(prepared.joinedText, "1k", "Total liabilities", 1) ||
      findScheduleLinePairInLines(prepared.lines, "1k", ["Total liabilities"], 1);
    const scheduleNetAssetsBeginningOfYear =
      findScheduleLinePair(prepared.joinedText, "1l", "Net assets", 0) ||
      findScheduleLinePairInLines(prepared.lines, "1l", ["Net assets"], 0);
    const scheduleNetAssetsEndOfYear =
      findScheduleLinePair(prepared.joinedText, "1l", "Net assets", 1) ||
      findScheduleLinePairInLines(prepared.lines, "1l", ["Net assets"], 1);
    rawMatches.netAssetsBeginningOfYear = scheduleNetAssetsBeginningOfYear;
    rawMatches.netAssetsEndOfYear = scheduleNetAssetsEndOfYear;
    rawMatches.scheduleHAccountantOpinion =
      findAccountantOpinion(prepared.joinedText) || findTextValue(prepared.lines, ["accountant's opinion", "opinion"]);
    rawMatches.fundingTargetAttainmentPercent =
      findTrailingLineCodeValue(prepared.joinedText, "Funding target attainment percentage", "14", "-?\\d[\\d,]*(?:\\.\\d+)?\\s*%?") ||
      findSingleValue(prepared.joinedText, ["funding target attainment percentage", "line 27"], "\\d[\\d.,]*%?");
    rawMatches.benefitsPaid =
      findLinePairValue(prepared.lines, ["Benefits? paid(?: to participants)?"], 0, "financial-statements") ||
      findFinancialStatementRowPair(prepared.joinedText, "Benefits? paid(?: to participants)?", 0) ||
      findLinePairValue(prepared.lines, ["Benefits? paid(?: to participants)?"], 1, "financial-statements") ||
      findFinancialStatementRowPair(prepared.joinedText, "Benefits? paid(?: to participants)?", 1);
    rawMatches.administrativeExpenses =
      findLinePairValue(prepared.lines, ["Administrative expenses"], 0, "financial-statements") ||
      findFinancialStatementRowPair(prepared.joinedText, "Administrative expenses", 0) ||
      findLinePairValue(prepared.lines, ["Administrative expenses"], 1, "financial-statements") ||
      findFinancialStatementRowPair(prepared.joinedText, "Administrative expenses", 1);
    rawMatches.employerContributions =
      findLinePairValue(prepared.lines, ["Employer contributions"], 0, "financial-statements") ||
      findFinancialStatementRowPair(prepared.joinedText, "Employer contributions", 0) ||
      findLinePairValue(prepared.lines, ["Employer contributions"], 1, "financial-statements") ||
      findFinancialStatementRowPair(prepared.joinedText, "Employer contributions", 1);
    rawMatches.investmentIncome =
      findLinePairValue(
        prepared.lines,
        ["Net appreciation \\(depreciation\\) in fair value of investments", "Interest and dividend income", "Investment income"],
        0,
        "financial-statements"
      ) ||
      findFinancialStatementRowPair(
        prepared.joinedText,
        "Net appreciation \\(depreciation\\) in fair value of investments|Interest and dividend income|Investment income",
        0,
        { prefixPattern: "statements? of changes? in net assets available for (?:plan )?benefits" }
      ) ||
      findLinePairValue(
        prepared.lines,
        ["Net appreciation \\(depreciation\\) in fair value of investments", "Interest and dividend income", "Investment income"],
        1,
        "financial-statements"
      ) ||
      findFinancialStatementRowPair(
        prepared.joinedText,
        "Net appreciation \\(depreciation\\) in fair value of investments|Interest and dividend income|Investment income",
        1,
        { prefixPattern: "statements? of changes? in net assets available for (?:plan )?benefits" }
      );
    rawMatches.netChangeInAssets =
      findLinePairValue(
        prepared.lines,
        ["Net increase \\(decrease\\) before transfers to and from other plans", "Net increase \\(decrease\\)", "Net change in net assets"],
        0,
        "financial-statements"
      ) ||
      findFinancialStatementRowPair(
        prepared.joinedText,
        "Net increase \\(decrease\\) before transfers to and from other plans|Net increase \\(decrease\\)|Net change in net assets",
        0,
        { prefixPattern: "statements? of changes? in net assets available for (?:plan )?benefits" }
      ) ||
      findLinePairValue(
        prepared.lines,
        ["Net increase \\(decrease\\) before transfers to and from other plans", "Net increase \\(decrease\\)", "Net change in net assets"],
        1,
        "financial-statements"
      ) ||
      findFinancialStatementRowPair(
        prepared.joinedText,
        "Net increase \\(decrease\\) before transfers to and from other plans|Net increase \\(decrease\\)|Net change in net assets",
        1,
        { prefixPattern: "statements? of changes? in net assets available for (?:plan )?benefits" }
      );
    rawMatches.actuarialPresentValueOfAccumulatedPlanBenefits =
      findActuarialAttachmentValue(prepared.joinedText, "Actuarial present value of accumulated plan benefits");
    rawMatches.contributingEmployerCount =
      findTrailingLineCodeValue(prepared.joinedText, "Contributing employers", "13", "\\d[\\d,]*") ||
      findSingleValue(prepared.joinedText, ["contributing employers"], "\\d[\\d,]*");
    rawMatches.inactiveParticipantCount =
      findTrailingLineCodeValue(prepared.joinedText, "Inactive participants receiving benefits", "14a", "\\d[\\d,]*") ||
      findSingleValue(prepared.joinedText, ["inactive participants receiving benefits"], "\\d[\\d,]*");

    const statementNetAssetsBeginningOfYear =
      findLinePairValue(
        prepared.lines,
        ["Net assets available(?: for (?:plan )?benefits)?"],
        1,
        "financial-statements",
        /statements?\s+of\s+net\s+assets|year ended|december\s+\d{1,2},?\s+\d{4}|june\s+\d{1,2},?\s+\d{4}/i
      ) ||
      findFinancialStatementPair(
        prepared.joinedText,
        "Net assets available(?: for (?:plan )?benefits)?",
        1
      );
    const statementNetAssetsEndOfYear =
      findLinePairValue(
        prepared.lines,
        ["Net assets available(?: for (?:plan )?benefits)?"],
        0,
        "financial-statements",
        /statements?\s+of\s+net\s+assets|year ended|december\s+\d{1,2},?\s+\d{4}|june\s+\d{1,2},?\s+\d{4}/i
      ) ||
      findFinancialStatementPair(
        prepared.joinedText,
        "Net assets available(?: for (?:plan )?benefits)?",
        0
      );
    const statementAssetsBeginningOfYear = findFinancialStatementAssetTotal(prepared.joinedText, pages, 1);
    const statementAssetsEndOfYear = findFinancialStatementAssetTotal(prepared.joinedText, pages, 0);

    registerConflict("netAssetsBeginningOfYear", scheduleNetAssetsBeginningOfYear, statementNetAssetsBeginningOfYear);
    registerConflict("netAssetsEndOfYear", scheduleNetAssetsEndOfYear, statementNetAssetsEndOfYear);
    registerConflict("assetsBeginningOfYear", scheduleAssetsBeginningOfYear, statementAssetsBeginningOfYear);
    registerConflict("assetsEndOfYear", scheduleAssetsEndOfYear, statementAssetsEndOfYear);

    if (!rawMatches.netAssetsBeginningOfYear || isLikelyPlaceholderMatch(rawMatches.netAssetsBeginningOfYear)) {
      rawMatches.netAssetsBeginningOfYear = statementNetAssetsBeginningOfYear || rawMatches.netAssetsBeginningOfYear;
    }
    if (!rawMatches.netAssetsEndOfYear || isLikelyPlaceholderMatch(rawMatches.netAssetsEndOfYear)) {
      rawMatches.netAssetsEndOfYear = statementNetAssetsEndOfYear || rawMatches.netAssetsEndOfYear;
    }
    if (!rawMatches.assetsBeginningOfYear || isLikelyPlaceholderMatch(rawMatches.assetsBeginningOfYear)) {
      rawMatches.assetsBeginningOfYear = statementAssetsBeginningOfYear || rawMatches.assetsBeginningOfYear;
    }
    if (!rawMatches.assetsEndOfYear || isLikelyPlaceholderMatch(rawMatches.assetsEndOfYear)) {
      rawMatches.assetsEndOfYear = statementAssetsEndOfYear || rawMatches.assetsEndOfYear;
    }

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
          message: "Schedule " + supportedSchedules.join(" or ") + " is not present in this filing package.",
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
          sourceType: inferSourceType(definition, matchDetails),
          sourcePage: matchDetails && matchDetails.sourcePage != null ? matchDetails.sourcePage : null,
          sourceLabel: matchDetails && matchDetails.sourceLabel ? matchDetails.sourceLabel : definition.name,
          excerpt: matchDetails && matchDetails.excerpt ? matchDetails.excerpt : rawValue
        });
        conflicts
          .filter((entry) => entry.fieldId === definition.fieldId)
          .forEach((entry) => {
            evidence.push({
              fieldId: definition.fieldId,
              status: "conflicting",
              sourceType: inferSourceType(definition, entry.alternateMatch),
              sourcePage: entry.alternateMatch && entry.alternateMatch.sourcePage != null ? entry.alternateMatch.sourcePage : null,
              sourceLabel: entry.alternateMatch && entry.alternateMatch.sourceLabel ? entry.alternateMatch.sourceLabel : definition.name,
              excerpt: entry.alternateMatch && entry.alternateMatch.excerpt ? entry.alternateMatch.excerpt : entry.alternateMatch.value
            });
            exceptions.push({
              fieldId: definition.fieldId,
              code: "conflict",
              message: "Multiple non-placeholder sources disagree for this field.",
              sourcePage: entry.alternateMatch && entry.alternateMatch.sourcePage != null ? entry.alternateMatch.sourcePage : null,
              sourceLabel: entry.alternateMatch && entry.alternateMatch.sourceLabel ? entry.alternateMatch.sourceLabel : definition.name
            });
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
