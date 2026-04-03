(function (global, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.Form5500OcrPipeline = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  let tesseractReadyPromise = null;
  let tesseractModuleUrl = null;
  let tesseractWorkerUrl = null;
  let tesseractCoreUrl = null;

  function getVendorBundle() {
    return globalThis.__FORM5500_VENDOR__ || {};
  }

  function decodeBase64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function setIndexedDbValue(dbName, storeName, key, value) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName);
        }
      };
      request.onerror = () => reject(request.error || new Error("IndexedDB open failed."));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(storeName, "readwrite");
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error || new Error("IndexedDB write failed."));
        };
        transaction.objectStore(storeName).put(value, key);
      };
    });
  }

  async function ensureLanguageCache() {
    const vendor = getVendorBundle();
    if (!vendor.tesseractEnglishDataBase64 || typeof indexedDB === "undefined") {
      throw new Error("Embedded OCR language data is missing from the build.");
    }
    await setIndexedDbValue(
      "keyval-store",
      "keyval",
      "./eng.traineddata",
      decodeBase64ToUint8Array(vendor.tesseractEnglishDataBase64)
    );
  }

  async function ensureTesseract() {
    if (tesseractReadyPromise) {
      return tesseractReadyPromise;
    }

    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error("OCR is only available in the browser build.");
    }

    const vendor = getVendorBundle();
    if (
      !vendor.tesseractModuleBase64 ||
      !vendor.tesseractWorkerBase64 ||
      !vendor.tesseractCoreBase64 ||
      !vendor.tesseractEnglishDataBase64
    ) {
      throw new Error("Embedded OCR assets are missing from the build.");
    }

    tesseractReadyPromise = (async () => {
      await ensureLanguageCache();
      if (!globalThis.Tesseract) {
        const moduleSource = atob(vendor.tesseractModuleBase64);
        tesseractModuleUrl = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = tesseractModuleUrl;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load embedded Tesseract module."));
          document.head.appendChild(script);
        });
      }
      if (!globalThis.Tesseract || typeof globalThis.Tesseract.createWorker !== "function") {
        throw new Error("Embedded Tesseract module did not initialize.");
      }
      if (!tesseractWorkerUrl) {
        tesseractWorkerUrl = URL.createObjectURL(
          new Blob([atob(vendor.tesseractWorkerBase64)], { type: "text/javascript" })
        );
      }
      if (!tesseractCoreUrl) {
        tesseractCoreUrl = URL.createObjectURL(
          new Blob([atob(vendor.tesseractCoreBase64)], { type: "text/javascript" })
        );
      }
      return globalThis.Tesseract;
    })();

    return tesseractReadyPromise;
  }

  async function recognizePage(worker, page, pageIndex, pageCount, onProgress) {
    onProgress(15 + Math.round((pageIndex / Math.max(pageCount, 1)) * 5), `OCR page ${pageIndex + 1} of ${pageCount}`);
    const result = await worker.recognize(page.imageDataUrl);
    const text = result && result.data && result.data.text ? String(result.data.text).trim() : "";
    const confidence = result && result.data && typeof result.data.confidence === "number"
      ? result.data.confidence
      : null;
    return {
      pageNumber: page.pageNumber,
      text,
      confidence
    };
  }

  async function attemptOcrFallback(pdfData, options) {
    const settings = options || {};
    const onProgress = settings.onProgress || function noop() {};
    const createWorkerOverride = typeof settings.createWorker === "function" ? settings.createWorker : null;

    if (typeof window === "undefined" && !createWorkerOverride) {
      onProgress(90, "OCR unavailable outside the browser build");
      return {
        status: "ocr-unavailable",
        message: "OCR is only available in the browser build.",
        confidence: null,
        text: "",
        pages: []
      };
    }

    const pages = Array.isArray(pdfData && pdfData.pages)
      ? pdfData.pages.filter((page) => page && page.imageDataUrl)
      : [];

    if (!pages.length) {
      onProgress(90, "No rasterized page images were available for OCR");
      return {
        status: "ocr-manual-review",
        message:
          "This filing does not contain readable text, and the app could not prepare page images for OCR. Try a cleaner scan or re-ingest a text-searchable PDF.",
        confidence: null,
        text: "",
        pages: []
      };
    }

    let worker = null;
    try {
      onProgress(10, "Loading offline OCR engine");
      if (createWorkerOverride) {
        worker = await createWorkerOverride();
      } else {
        const tesseract = await ensureTesseract();
        worker = await tesseract.createWorker("eng", 1, {
          workerPath: tesseractWorkerUrl,
          corePath: tesseractCoreUrl,
          langPath: "/offline-cache",
          gzip: true,
          logger(event) {
            if (!event || event.status !== "recognizing text" || typeof event.progress !== "number") {
              return;
            }
            onProgress(20 + Math.round(event.progress * 70), "Recognizing scanned filing text");
          }
        });
      }

      const recognizedPages = [];
      for (let index = 0; index < pages.length; index += 1) {
        recognizedPages.push(await recognizePage(worker, pages[index], index, pages.length, onProgress));
      }

      const text = recognizedPages.map((page) => page.text).filter(Boolean).join("\n");
      const confidenceValues = recognizedPages
        .map((page) => page.confidence)
        .filter((value) => typeof value === "number" && Number.isFinite(value));
      const confidence = confidenceValues.length
        ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(1))
        : null;

      onProgress(95, "Finishing OCR extraction");

      if (!text.trim()) {
        return {
          status: "ocr-manual-review",
          message:
            "OCR ran locally, but it could not recover enough readable text from this filing. Try a cleaner scan or continue with manual remediation.",
          confidence,
          text: "",
          pages: recognizedPages
        };
      }

      return {
        status: "ok",
        message: confidence == null ? "OCR completed." : `OCR completed with ${confidence.toFixed(1)} confidence.`,
        confidence,
        text,
        pages: recognizedPages
      };
    } catch (error) {
      return {
        status: "ocr-manual-review",
        message:
          error && error.message
            ? `OCR could not complete locally: ${error.message}`
            : "OCR could not complete locally. Continue with manual remediation.",
        confidence: null,
        text: "",
        pages: []
      };
    } finally {
      if (worker && typeof worker.terminate === "function") {
        await worker.terminate();
      }
    }
  }

  function cleanup() {
    if (tesseractWorkerUrl) {
      URL.revokeObjectURL(tesseractWorkerUrl);
      tesseractWorkerUrl = null;
    }
    if (tesseractCoreUrl) {
      URL.revokeObjectURL(tesseractCoreUrl);
      tesseractCoreUrl = null;
    }
    if (tesseractModuleUrl) {
      URL.revokeObjectURL(tesseractModuleUrl);
      tesseractModuleUrl = null;
    }
    tesseractReadyPromise = null;
  }

  return {
    attemptOcrFallback,
    cleanup
  };
});
