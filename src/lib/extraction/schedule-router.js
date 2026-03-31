(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500ScheduleRouter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function detectFilingYear(documentText, fileName) {
    const text = `${documentText || ""}\n${fileName || ""}`;
    const planYearMatch = text.match(/(?:beginning|begin)\s+(\d{1,2}[/-]\d{1,2}[/-](\d{4})).*?(?:ending|end)\s+(\d{1,2}[/-]\d{1,2}[/-](\d{4}))/is);
    if (planYearMatch) {
      return Number(planYearMatch[4]);
    }

    const explicitMatch = text.match(/\b(19\d{2}|20\d{2})\b/g);
    if (explicitMatch && explicitMatch.length) {
      return Number(explicitMatch[explicitMatch.length - 1]);
    }

    return 2024;
  }

  function detectSchedules(documentText) {
    const text = String(documentText || "").toUpperCase();
    const scheduleCodes = ["A", "C", "D", "G", "H", "I", "MB", "R", "SB"];
    return scheduleCodes.filter((code) => new RegExp(`SCHEDULE\\s+${code}\\b`, "i").test(text));
  }

  function detectContext(documentText, fileName) {
    return {
      filingYear: detectFilingYear(documentText, fileName),
      schedules: detectSchedules(documentText)
    };
  }

  return {
    detectContext
  };
});
