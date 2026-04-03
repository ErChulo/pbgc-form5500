(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500ExtractionQuality = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createEvidence(fieldId, status, details) {
    return {
      fieldId,
      status,
      sourcePage: details && details.sourcePage != null ? details.sourcePage : null,
      sourceLabel: details && details.sourceLabel ? details.sourceLabel : null,
      excerpt: details && details.excerpt ? details.excerpt : null
    };
  }

  function createException(fieldId, code, message, details) {
    return {
      fieldId,
      code,
      message,
      sourcePage: details && details.sourcePage != null ? details.sourcePage : null,
      sourceLabel: details && details.sourceLabel ? details.sourceLabel : null
    };
  }

  function summarizeFieldMap(fieldMap) {
    const values = Object.values(fieldMap || {});
    const parsedFieldCount = values.filter((field) => field && field.parseStatus === "parsed").length;
    const failedFieldCount = values.filter((field) => field && field.parseStatus === "failed").length;
    const missingFieldCount = values.filter((field) => field && field.parseStatus === "missing").length;
    return {
      parsedFieldCount,
      failedFieldCount,
      missingFieldCount,
      expectedFieldCount: values.length
    };
  }

  function summarizeNumericValidation(fieldMap, schemaRegistry, exceptions) {
    const definitions = Array.isArray(schemaRegistry) ? schemaRegistry : [];
    const targeted = definitions.filter((definition) =>
      ["integer", "decimal", "currency", "percent"].includes(definition.dataType)
    );
    const targetedFieldIds = new Set(targeted.map((definition) => definition.fieldId));
    const entries = targeted.map((definition) => fieldMap && fieldMap[definition.fieldId]).filter(Boolean);
    const exceptionList = Array.isArray(exceptions) ? exceptions : [];
    const maskedFieldIds = new Set(
      exceptionList.filter((entry) => entry && entry.code === "masked-numeric-evidence").map((entry) => entry.fieldId)
    );
    const scheduleAbsentFieldIds = new Set(
      exceptionList.filter((entry) => entry && entry.code === "schedule-not-present").map((entry) => entry.fieldId)
    );

    const validatedNumericFieldCount = entries.filter((field) => field.parseStatus === "parsed").length;
    const failedNumericFieldCount = entries.filter((field) => field.parseStatus === "failed").length;
    const unresolvedNumericFieldCount = entries.filter(
      (field, index) =>
        field.parseStatus === "missing" &&
        !maskedFieldIds.has(targeted[index].fieldId) &&
        !scheduleAbsentFieldIds.has(targeted[index].fieldId)
    ).length;
    const maskedNumericFieldCount = Array.from(maskedFieldIds).filter((fieldId) => targetedFieldIds.has(fieldId)).length;
    const notApplicableNumericFieldCount = Array.from(scheduleAbsentFieldIds).filter((fieldId) => targetedFieldIds.has(fieldId)).length;

    let filingNumericSufficiency = "insufficient";
    if (validatedNumericFieldCount && !failedNumericFieldCount && !unresolvedNumericFieldCount && !maskedNumericFieldCount) {
      filingNumericSufficiency = "sufficient";
    } else if (validatedNumericFieldCount) {
      filingNumericSufficiency = "partial";
    }

    return {
      targetedNumericFieldCount: targeted.length,
      validatedNumericFieldCount,
      maskedNumericFieldCount,
      failedNumericFieldCount,
      unresolvedNumericFieldCount,
      notApplicableNumericFieldCount,
      filingNumericSufficiency
    };
  }

  function summarizeReviewState(exceptions) {
    const exceptionList = Array.isArray(exceptions) ? exceptions : [];
    const counts = {
      exceptionCount: exceptionList.length,
      maskedCount: 0,
      missingCount: 0,
      failedCount: 0,
      notApplicableCount: 0
    };

    exceptionList.forEach((entry) => {
      if (!entry || !entry.code) {
        return;
      }
      if (entry.code === "masked-numeric-evidence") {
        counts.maskedCount += 1;
      } else if (entry.code === "schedule-not-present") {
        counts.notApplicableCount += 1;
      } else if (entry.code === "parse-failed") {
        counts.failedCount += 1;
      } else if (entry.code === "missing") {
        counts.missingCount += 1;
      }
    });

    return counts;
  }

  return {
    createEvidence,
    createException,
    summarizeFieldMap,
    summarizeNumericValidation,
    summarizeReviewState
  };
});
