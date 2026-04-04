(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500ScheduleRouter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const scheduleCodes = ["A", "C", "D", "G", "H", "I", "MB", "R", "SB"];

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
    return scheduleCodes.filter((code) => new RegExp(`SCHEDULE\\s+${code}\\b`, "i").test(text));
  }

  function classifyPageType(pageText) {
    const text = String(pageText || "").trim();
    if (!text) {
      return "unknown";
    }
    if (/independent\s+auditor'?s\s+report|auditor'?s\s+report/i.test(text)) {
      return "auditor-report";
    }
    if (/statements?\s+of\s+net\s+assets\s+available|statement\s+of\s+changes?\s+in\s+net\s+assets|statement\s+of\s+accumulated\s+plan\s+benefits/i.test(text)) {
      return "financial-statement";
    }
    if (scheduleCodes.some((code) => new RegExp(`SCHEDULE\\s+${code}\\b`, "i").test(text))) {
      return "schedule";
    }
    if (/actuarial|funding\s+target\s+attainment/i.test(text)) {
      return "actuarial-attachment";
    }
    return "main-form";
  }

  function detectSchedulePages(pages) {
    const schedulePages = {};
    (Array.isArray(pages) ? pages : []).forEach((page, index) => {
      const text = page && page.text ? page.text : "";
      scheduleCodes.forEach((code) => {
        if (new RegExp(`SCHEDULE\\s+${code}\\b`, "i").test(text)) {
          if (!schedulePages[code]) {
            schedulePages[code] = [];
          }
          schedulePages[code].push(page && page.pageNumber ? page.pageNumber : index + 1);
        }
      });
    });
    return schedulePages;
  }

  function detectContext(documentText, fileName, pages) {
    const normalizedPages = Array.isArray(pages) ? pages : [];
    return {
      filingYear: detectFilingYear(documentText, fileName),
      schedules: detectSchedules(documentText),
      schedulePages: detectSchedulePages(normalizedPages),
      pageTypes: normalizedPages.map((page, index) => ({
        pageNumber: page && page.pageNumber ? page.pageNumber : index + 1,
        pageType: classifyPageType(page && page.text ? page.text : "")
      }))
    };
  }

  return {
    classifyPageType,
    detectContext
  };
});
