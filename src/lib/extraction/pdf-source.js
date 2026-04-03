(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500PdfSource = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  let pdfJsPromise = null;
  let workerUrl = null;

  function getVendorBundle() {
    return globalThis.__FORM5500_VENDOR__ || {};
  }

  async function ensurePdfJs() {
    if (pdfJsPromise) {
      return pdfJsPromise;
    }

    if (typeof window === "undefined") {
      throw new Error("PDF extraction is only available in the browser build.");
    }

    const vendor = getVendorBundle();
    if (!vendor.pdfModuleBase64 || !vendor.pdfWorkerBase64) {
      throw new Error("Embedded pdf.js assets are missing from the build.");
    }

    pdfJsPromise = (async () => {
      const moduleSource = atob(vendor.pdfModuleBase64);
      const workerSource = atob(vendor.pdfWorkerBase64);
      const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
      workerUrl = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
      const pdfjsLib = await import(moduleUrl);
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjsLib;
    })();

    return pdfJsPromise;
  }

  async function extractPdfDataFromBlob(blob, options) {
    const settings = options || {};
    const onProgress = settings.onProgress || function noop() {};
    const pdfjsLib = await ensurePdfJs();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const pages = [];
    const textParts = [];
    onProgress(5, "Loading PDF");

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/[ ]+/g, " ")
        .trim();
      pages.push({
        pageNumber: pageIndex,
        text: pageText
      });
      if (pageText) {
        textParts.push(pageText);
      }
      onProgress(Math.round((pageIndex / pdf.numPages) * 80) + 10, `Reading page ${pageIndex} of ${pdf.numPages}`);
    }

    return {
      pageCount: pdf.numPages,
      pages,
      documentText: pages.map((page) => page.text).join("\n"),
      textSource: textParts.length ? "native" : "none"
    };
  }

  function cleanup() {
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
      workerUrl = null;
    }
  }

  return {
    cleanup,
    ensurePdfJs,
    extractPdfDataFromBlob
  };
});
