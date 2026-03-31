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

  return {
    createEvidence,
    createException,
    summarizeFieldMap
  };
});
