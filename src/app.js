(function () {
  const core = window.Form5500Core;
  const pdfSource = window.Form5500PdfSource;
  const ocrPipeline = window.Form5500OcrPipeline;
  const schemaRegistry = core.getDefaultSchemaRegistry();
  const mandatoryColumnKeys = [
    "planName",
    "planNumber",
    "sponsorEmployerIdentificationNumber",
    "planYearBeginDate",
    "planYearEndDate",
    "filingKind",
    "receivedTimestamp",
    "extractionQuality"
  ];

  const state = {
    queueItems: [],
    extractedById: {},
    schemaRegistry,
    settings: {
      highContrast: false,
      visibleAdditionalColumns: schemaRegistry
        .filter((field) => field.exportGroup === "allYears")
        .filter((field) => !mandatoryColumnKeys.includes(field.name))
        .map((field) => field.name)
    },
    previewUrl: null,
    idCounter: 0,
    renderQueued: false
  };

  const elements = {
    tabIngestion: document.getElementById("tab-ingestion"),
    tabAllYears: document.getElementById("tab-all-years"),
    panelIngestion: document.getElementById("panel-ingestion"),
    panelAllYears: document.getElementById("panel-all-years"),
    localPdfInput: document.getElementById("local-pdf-input"),
    csvInput: document.getElementById("csv-input"),
    dropzone: document.getElementById("dropzone"),
    urlInput: document.getElementById("url-input"),
    addLinksButton: document.getElementById("add-links-button"),
    downloadNowButton: document.getElementById("download-now-button"),
    queueSummary: document.getElementById("queue-summary"),
    queueTableBody: document.getElementById("queue-table-body"),
    allYearsHeadRow: document.getElementById("all-years-head-row"),
    allYearsBody: document.getElementById("all-years-body"),
    downloadCsvButton: document.getElementById("download-csv-button"),
    copyCsvButton: document.getElementById("copy-csv-button"),
    columnChooserList: document.getElementById("column-chooser-list"),
    status: document.getElementById("app-status"),
    highContrastToggle: document.getElementById("high-contrast-toggle"),
    remoteOriginWarning: document.getElementById("remote-origin-warning"),
    previewDialog: document.getElementById("preview-dialog"),
    previewFrame: document.getElementById("preview-frame"),
    previewTitle: document.getElementById("preview-title"),
    originChip: document.getElementById("origin-chip")
  };

  function nextIngestId() {
    state.idCounter += 1;
    return `ing-${String(state.idCounter).padStart(4, "0")}`;
  }

  function setStatus(message, kind) {
    elements.status.textContent = message;
    elements.status.className = `status-bar${kind ? ` ${kind}` : ""}`;
  }

  function scheduleRender() {
    if (state.renderQueued) {
      return;
    }
    state.renderQueued = true;
    requestAnimationFrame(() => {
      state.renderQueued = false;
      render();
    });
  }

  function sanitizeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatBytes(size) {
    if (!size && size !== 0) {
      return "Unknown";
    }
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function createQueueItem(input) {
    const item = {
      id: nextIngestId(),
      sourceType: input.sourceType,
      displayName: input.displayName || input.fileName || input.remoteUrl || "Untitled",
      fileName: input.fileName || input.displayName || "",
      size: input.size == null ? null : input.size,
      status: input.status || "queued",
      progress: input.progress || 0,
      remoteUrl: input.remoteUrl || null,
      detailUrl: input.detailUrl || null,
      blob: input.blob || null,
      metadata: input.metadata || null,
      originalRow: input.originalRow || null,
      errorClass: input.errorClass || null,
      errorMessage: input.errorMessage || null,
      ingestionTimestamp: new Date().toISOString(),
      previewName: input.previewName || input.displayName || input.fileName || "Preview",
      abortController: null,
      extractionSummary: null
    };
    state.queueItems.push(item);
    scheduleExtractionForItem(item);
    return item;
  }

  function setExtractedRecord(item, extracted) {
    state.extractedById[item.id] = extracted;
    const exceptions = extracted.extraction && Array.isArray(extracted.extraction.exceptions)
      ? extracted.extraction.exceptions
      : [];
    item.extractionSummary = {
      parsedFieldCount: extracted.metrics.parsedFieldCount,
      expectedFieldCount: extracted.metrics.expectedFieldCount,
      exceptionCount: exceptions.length,
      unresolvedFieldIds: exceptions.slice(0, 4).map((entry) => entry.fieldId)
    };
  }

  function syncExtractedForItem(item) {
    if (item.metadata) {
      setExtractedRecord(item, core.buildExtractedFromCsvRow(item.metadata, {
        ingestId: item.id,
        ingestionTimestamp: item.ingestionTimestamp,
        schemaRegistry: state.schemaRegistry
      }));
      return;
    }

    const nameSource = item.fileName || item.displayName || item.remoteUrl || "";
    setExtractedRecord(item, core.buildExtractedFromFilename(nameSource, {
      ingestId: item.id,
      ingestionTimestamp: item.ingestionTimestamp,
      schemaRegistry: state.schemaRegistry
    }));
  }

  async function scheduleExtractionForItem(item) {
    syncExtractedForItem(item);
    if (!item.blob || !pdfSource || typeof pdfSource.extractPdfDataFromBlob !== "function") {
      scheduleRender();
      return;
    }

    item.status = "extracting";
    item.progress = 5;
    item.errorClass = null;
    item.errorMessage = null;
    scheduleRender();

    try {
      const pdfData = await pdfSource.extractPdfDataFromBlob(item.blob, {
        onProgress(progress, message) {
          item.progress = progress;
          if (message) {
            item.errorMessage = message;
          }
          scheduleRender();
        }
      });

      let ocrResult = null;
      if (!pdfData.documentText || !pdfData.documentText.trim()) {
        ocrResult = await ocrPipeline.attemptOcrFallback(pdfData, {
          onProgress(progress, message) {
            item.progress = progress;
            if (message) {
              item.errorMessage = message;
            }
            scheduleRender();
          }
        });
      }

      const extracted = core.buildExtractedFromPdfData(pdfData, {
        ingestId: item.id,
        ingestionTimestamp: item.ingestionTimestamp,
        schemaRegistry: state.schemaRegistry,
        fileName: item.fileName || item.displayName,
        ocr: ocrResult
      });
      setExtractedRecord(item, extracted);
      item.progress = 100;
      if (ocrResult && ocrResult.status !== "ok") {
        item.status = "ocr-manual-review";
        item.errorClass = ocrResult.status;
        item.errorMessage = ocrResult.message;
      } else if (item.extractionSummary && item.extractionSummary.exceptionCount) {
        item.status = "ready-with-exceptions";
        item.errorMessage = `Parsed ${item.extractionSummary.parsedFieldCount}/${item.extractionSummary.expectedFieldCount} fields with unresolved values.`;
      } else {
        item.status = "ready";
        item.errorMessage = `Parsed ${item.extractionSummary.parsedFieldCount}/${item.extractionSummary.expectedFieldCount} fields.`;
      }
      scheduleRender();
    } catch (error) {
      item.status = "error";
      item.progress = 0;
      item.errorClass = "extraction-failed";
      item.errorMessage = error && error.message ? error.message : "PDF extraction failed.";
      scheduleRender();
    }
  }

  function removeItem(itemId) {
    const index = state.queueItems.findIndex((item) => item.id === itemId);
    if (index === -1) {
      return;
    }
    const [item] = state.queueItems.splice(index, 1);
    if (item.abortController) {
      item.abortController.abort();
    }
    if (item.previewObjectUrl) {
      URL.revokeObjectURL(item.previewObjectUrl);
    }
    delete state.extractedById[itemId];
    scheduleRender();
  }

  function setActiveTab(tabName) {
    const showAllYears = tabName === "all-years";
    elements.tabIngestion.classList.toggle("active", !showAllYears);
    elements.tabAllYears.classList.toggle("active", showAllYears);
    elements.tabIngestion.setAttribute("aria-selected", String(!showAllYears));
    elements.tabAllYears.setAttribute("aria-selected", String(showAllYears));
    elements.panelIngestion.hidden = showAllYears;
    elements.panelAllYears.hidden = !showAllYears;
    elements.panelIngestion.classList.toggle("active", !showAllYears);
    elements.panelAllYears.classList.toggle("active", showAllYears);
  }

  function openPreview(itemId) {
    const item = state.queueItems.find((entry) => entry.id === itemId);
    if (!item || !item.blob) {
      setStatus("Preview is only available for items with a PDF blob.", "warning");
      return;
    }

    closePreview();
    state.previewUrl = URL.createObjectURL(item.blob);
    elements.previewFrame.src = state.previewUrl;
    elements.previewTitle.textContent = `Preview: ${item.previewName}`;
    if (typeof elements.previewDialog.showModal === "function") {
      elements.previewDialog.showModal();
    }
  }

  function closePreview() {
    elements.previewFrame.removeAttribute("src");
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }
    if (elements.previewDialog.open) {
      elements.previewDialog.close();
    }
  }

  async function handleLocalPdfFiles(fileList) {
    const files = Array.from(fileList).filter((file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf");
    files.forEach((file) => {
      createQueueItem({
        sourceType: "localPdf",
        displayName: file.name,
        fileName: file.name,
        size: file.size,
        status: "ready",
        blob: file,
        previewName: file.name
      });
    });
    if (files.length) {
      setStatus(`Added ${files.length} local PDF file${files.length === 1 ? "" : "s"} to the queue.`, "ok");
      scheduleRender();
    }
  }

  async function handleCsvFiles(fileList) {
    const files = Array.from(fileList).filter((file) => /\.csv$/i.test(file.name) || file.type.includes("csv"));
    for (const file of files) {
      const text = await file.text();
      const ingested = core.ingestEfastCsv(text, { sourceName: file.name });
      ingested.records.forEach((record) => {
      createQueueItem({
        sourceType: "remoteFromCsv",
        displayName: record.displayName,
        fileName: record.remoteUrl ? record.remoteUrl.split("/").pop() || record.displayName : record.displayName,
        status: record.remoteUrl ? "manual-download-required" : "metadata-only",
        remoteUrl: record.remoteUrl,
        detailUrl: record.metadata.detailUrl || null,
        metadata: record.metadata,
          originalRow: record.originalRow,
          previewName: record.displayName
        });
      });
      setStatus(
        `Imported ${ingested.records.length} EFAST row${ingested.records.length === 1 ? "" : "s"} from ${file.name}.`,
        "ok"
      );
    }
    scheduleRender();
  }

  function addRemoteLinks() {
    const lines = elements.urlInput.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    lines.forEach((line) => {
      const url = line;
      let displayName = url;
      try {
        displayName = decodeURIComponent(new URL(url).pathname.split("/").pop() || url);
      } catch (_error) {
        displayName = url;
      }
      createQueueItem({
        sourceType: "remoteUrl",
        displayName,
        fileName: displayName,
        status: "manual-download-required",
        remoteUrl: url,
        previewName: displayName
      });
    });

    if (lines.length) {
      elements.urlInput.value = "";
      setStatus(`Queued ${lines.length} remote URL${lines.length === 1 ? "" : "s"}.`, "ok");
      scheduleRender();
    }
  }

  function applyManualDownloadGuidance() {
    let affectedCount = 0;
    state.queueItems.forEach((item) => {
      if (!item.remoteUrl) {
        return;
      }
      item.status = "manual-download-required";
      item.progress = 0;
      item.errorClass = null;
      item.errorMessage =
        "Open link to download the file in the browser, then drag the PDF into the app or use the local PDF picker.";
      affectedCount += 1;
    });

    if (affectedCount) {
      setStatus(
        "Remote links are references only. Open each link in the browser, save the PDF locally, then drag it back into the app.",
        "warning"
      );
      scheduleRender();
    }
  }

  function getSummaryCounts() {
    return state.queueItems.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {});
  }

  function renderQueue() {
    const counts = getSummaryCounts();
    elements.queueSummary.innerHTML = Object.keys(counts).length
      ? Object.entries(counts)
          .map(([status, count]) => `<span class="pill">${sanitizeHtml(status)}: ${count}</span>`)
          .join("")
      : `<span class="pill">queue empty</span>`;

    if (!state.queueItems.length) {
      elements.queueTableBody.innerHTML = `<tr><td colspan="7" class="empty">No queue items yet.</td></tr>`;
      return;
    }

    elements.queueTableBody.innerHTML = state.queueItems
      .map((item) => {
        const actions = [];
        if (item.blob) {
          actions.push(`<button type="button" class="small" data-action="preview" data-id="${item.id}">Preview</button>`);
        }
        if (item.remoteUrl) {
          actions.push(`<a class="buttonlike small secondary" href="${sanitizeHtml(item.remoteUrl)}" target="_blank" rel="noreferrer">Open link</a>`);
        } else if (item.detailUrl) {
          actions.push(`<a class="buttonlike small secondary" href="${sanitizeHtml(item.detailUrl)}" target="_blank" rel="noreferrer">Open detail</a>`);
        }
        actions.push(`<button type="button" class="small secondary" data-action="remove" data-id="${item.id}">Remove</button>`);

        const statusDetail = item.errorMessage
          ? `<div class="muted">${sanitizeHtml(item.errorMessage)}</div>`
          : item.status === "manual-download-required"
            ? `<div class="muted">Remote links are references only. Open the link, download the PDF manually, then drag it into the queue.</div>`
          : item.status === "metadata-only"
            ? `<div class="muted">No PDF URL in CSV row. Add a PDF manually or paste the missing link.</div>`
            : "";
        const extractionDetail = item.extractionSummary
          ? `<div class="muted">Extraction: ${sanitizeHtml(
              `${item.extractionSummary.parsedFieldCount}/${item.extractionSummary.expectedFieldCount} parsed`
            )}</div>${
              item.extractionSummary.unresolvedFieldIds.length
                ? `<div class="muted">Unresolved: ${sanitizeHtml(item.extractionSummary.unresolvedFieldIds.join(", "))}</div>`
                : ""
            }`
          : "";

        const metadataTag = item.metadata
          ? `<div class="muted mono">CSV trace row</div>`
          : "";

        return `
          <tr>
            <td class="mono">${sanitizeHtml(item.id)}</td>
            <td>${sanitizeHtml(item.sourceType)}</td>
            <td>
              <div>${sanitizeHtml(item.displayName)}</div>
              ${metadataTag}
            </td>
            <td>${sanitizeHtml(formatBytes(item.size))}</td>
            <td>
              <div class="pill">${sanitizeHtml(item.status)}</div>
              ${statusDetail}
              ${extractionDetail}
            </td>
            <td>${item.progress ? `${item.progress}%` : "-"}</td>
            <td><div class="actions-row">${actions.join("")}</div></td>
          </tr>
        `;
      })
      .join("");
  }

  function getVisibleColumns() {
    const aggregated = core.aggregateAllYears(Object.values(state.extractedById), state.schemaRegistry);
    const additional = aggregated.additionalColumns.filter((column) =>
      state.settings.visibleAdditionalColumns.includes(column.key)
    );
    return [...aggregated.mandatoryColumns, ...additional];
  }

  function renderAllYears() {
    const aggregated = core.aggregateAllYears(Object.values(state.extractedById), state.schemaRegistry);
    const visibleColumns = [
      ...aggregated.mandatoryColumns,
      ...aggregated.additionalColumns.filter((column) => state.settings.visibleAdditionalColumns.includes(column.key))
    ];

    elements.allYearsHeadRow.innerHTML = visibleColumns.map((column) => `<th>${sanitizeHtml(column.label)}</th>`).join("");

    if (!aggregated.rows.length) {
      elements.allYearsBody.innerHTML = `<tr><td colspan="${visibleColumns.length || 1}" class="empty">No extracted filings yet.</td></tr>`;
    } else {
      elements.allYearsBody.innerHTML = aggregated.rows
        .map(
          (row) =>
            `<tr>${visibleColumns
              .map((column) => `<td>${sanitizeHtml(row[column.key] || "")}</td>`)
              .join("")}</tr>`
        )
        .join("");
    }

    elements.columnChooserList.innerHTML = aggregated.additionalColumns.length
      ? aggregated.additionalColumns
          .map((column) => {
            const checked = state.settings.visibleAdditionalColumns.includes(column.key) ? "checked" : "";
            return `
              <label class="toggle">
                <input type="checkbox" data-column-key="${sanitizeHtml(column.key)}" ${checked}>
                <span>${sanitizeHtml(column.label)}</span>
              </label>
            `;
          })
          .join("")
      : `<span class="muted">No optional columns are defined yet.</span>`;
  }

  function downloadBlob(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportAllYears() {
    const aggregated = core.aggregateAllYears(Object.values(state.extractedById), state.schemaRegistry);
    const columns = getVisibleColumns();
    const csv = core.toCsv(columns, aggregated.rows);
    const filename = core.createExportFileName(aggregated.rows, core.VERSION);
    downloadBlob(filename, csv);
    setStatus(`Downloaded ${filename}.`, "ok");
  }

  async function copyAllYears() {
    const aggregated = core.aggregateAllYears(Object.values(state.extractedById), state.schemaRegistry);
    const columns = getVisibleColumns();
    const csv = core.toCsv(columns, aggregated.rows);
    try {
      await navigator.clipboard.writeText(csv);
      setStatus("CSV copied to clipboard.", "ok");
    } catch (_error) {
      setStatus("Clipboard write failed. Use Download CSV instead.", "warning");
    }
  }

  function renderOriginNote() {
    const fileOrigin = window.location.protocol === "file:";
    elements.originChip.textContent = fileOrigin ? "Origin: file://" : `Origin: ${window.location.origin}`;
    if (fileOrigin) {
      elements.remoteOriginWarning.hidden = false;
      elements.remoteOriginWarning.textContent =
        "Remote links are references only. The app never fetches them directly. Open each link in the browser, save the PDF locally, then drag it into the app or use the local file picker.";
    } else {
      elements.remoteOriginWarning.hidden = false;
      elements.remoteOriginWarning.textContent =
        "Remote links are references only. The app never fetches them directly. Open each link in the browser, save the PDF locally, then drag it into the app or use the local file picker.";
    }
  }

  function render() {
    renderQueue();
    renderAllYears();
    renderOriginNote();
  }

  function onQueueAction(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.getAttribute("data-action");
    const itemId = target.getAttribute("data-id");
    if (!action || !itemId) {
      return;
    }

    const item = state.queueItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    if (action === "preview") {
      openPreview(itemId);
    } else if (action === "remove") {
      removeItem(itemId);
    }
  }

  function handleDrop(files) {
    const pdfFiles = [];
    const csvFiles = [];
    Array.from(files).forEach((file) => {
      if (/\.csv$/i.test(file.name) || file.type.includes("csv")) {
        csvFiles.push(file);
      } else {
        pdfFiles.push(file);
      }
    });

    if (pdfFiles.length) {
      handleLocalPdfFiles(pdfFiles);
    }
    if (csvFiles.length) {
      handleCsvFiles(csvFiles);
    }
  }

  function bindEvents() {
    elements.tabIngestion.addEventListener("click", () => setActiveTab("ingestion"));
    elements.tabAllYears.addEventListener("click", () => setActiveTab("all-years"));
    elements.localPdfInput.addEventListener("change", (event) => handleLocalPdfFiles(event.target.files || []));
    elements.csvInput.addEventListener("change", (event) => handleCsvFiles(event.target.files || []));
    elements.addLinksButton.addEventListener("click", addRemoteLinks);
    elements.downloadNowButton.addEventListener("click", applyManualDownloadGuidance);
    elements.queueTableBody.addEventListener("click", onQueueAction);
    elements.downloadCsvButton.addEventListener("click", exportAllYears);
    elements.copyCsvButton.addEventListener("click", copyAllYears);
    elements.highContrastToggle.addEventListener("change", (event) => {
      state.settings.highContrast = Boolean(event.target.checked);
      document.body.classList.toggle("high-contrast", state.settings.highContrast);
    });
    elements.columnChooserList.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      const key = target.getAttribute("data-column-key");
      if (!key) {
        return;
      }
      if (target.checked) {
        if (!state.settings.visibleAdditionalColumns.includes(key)) {
          state.settings.visibleAdditionalColumns.push(key);
        }
      } else {
        state.settings.visibleAdditionalColumns = state.settings.visibleAdditionalColumns.filter((value) => value !== key);
      }
      scheduleRender();
    });
    elements.dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      elements.dropzone.classList.add("dragover");
    });
    elements.dropzone.addEventListener("dragleave", () => {
      elements.dropzone.classList.remove("dragover");
    });
    elements.dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      elements.dropzone.classList.remove("dragover");
      handleDrop(event.dataTransfer ? event.dataTransfer.files : []);
    });
    elements.dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        elements.localPdfInput.click();
      }
    });
    elements.previewDialog.addEventListener("close", closePreview);
  }

  bindEvents();
  render();
})();
