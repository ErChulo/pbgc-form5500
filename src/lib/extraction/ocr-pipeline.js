(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500OcrPipeline = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  async function attemptOcrFallback(_pdfData, options) {
    const onProgress = (options && options.onProgress) || function noop() {};
    onProgress(90, "OCR unavailable in the offline single-file build");
    return {
      status: "ocr-unavailable",
      message:
        "This filing does not contain readable text. Convert it to a text-searchable PDF outside the app, then ingest the converted PDF locally.",
      confidence: null,
      text: ""
    };
  }

  return {
    attemptOcrFallback
  };
});
