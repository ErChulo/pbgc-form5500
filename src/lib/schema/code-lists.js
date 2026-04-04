(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500CodeLists = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const codeLists = {
    filingKind: ["original", "amended", "final", "amended final"],
    yesNo: ["yes", "no"],
    planEntityCodes: ["large", "small", "direct filing entity"],
    scheduleCodes: ["A", "C", "D", "G", "H", "I", "MB", "R", "SB"],
    sourceTypes: ["main-form", "schedule", "financial-statement", "actuarial-attachment", "other-attachment", "unknown"],
    reviewStateCodes: ["parsed", "missing", "masked", "conflicting", "failed", "not-applicable"],
    attachmentFamilies: ["auditor-report", "audited-financial-statements", "actuarial-attachment", "supplemental-schedule"]
  };

  function getCodeList(codeListId) {
    return codeLists[codeListId] ? [...codeLists[codeListId]] : [];
  }

  function hasCode(codeListId, value) {
    const codeList = codeLists[codeListId];
    if (!codeList) {
      return false;
    }
    return codeList.includes(String(value || "").trim().toLowerCase());
  }

  return {
    codeLists,
    getCodeList,
    hasCode
  };
});
