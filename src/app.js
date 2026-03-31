(function () {
  const core = window.Form5500Core;
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
    downloadManager: {
      concurrency: 3,
      activeCount: 0
    },
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
    downloadConcurrency: document.getElementById("download-concurrency"),
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
      abortController: null
    };
    state.queueItems.push(item);
    syncExtractedForItem(item);
    return item;
  }

  function syncExtractedForItem(item) {
    if (item.metadata) {
      state.extractedById[item.id] = core.buildExtractedFromCsvRow(item.metadata, {
        ingestId: item.id,
        ingestionTimestamp: item.ingestionTimestamp,
        schemaRegistry: state.schemaRegistry
      });
      return;
    }

    const nameSource = item.fileName || item.displayName || item.remoteUrl || "";
    state.extractedById[item.id] = core.buildExtractedFromFilename(nameSource, {
      ingestId: item.id,
      ingestionTimestamp: item.ingestionTimestamp,
      schemaRegistry: state.schemaRegistry
    });
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
          status: record.remoteUrl ? "queued" : "metadata-only",
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
        status: "queued",
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

  function classifyResponseError(response, url) {
    if (response.status < 200 || response.status >= 300) {
      return {
        errorClass: "http",
        errorMessage: `Remote server responded with HTTP ${response.status} for ${url}.`
      };
    }
    return null;
  }

  function isLikelyPdf(bytes) {
    if (!bytes || bytes.length < 4) {
      return false;
    }
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }

  async function downloadItem(item) {
    if (!item.remoteUrl) {
      return;
    }

    if (window.location.protocol === "file:") {
      item.status = "error";
      item.errorClass = "fileOriginRestricted";
      item.errorMessage =
        "Remote downloads are blocked when the app is opened from file://. Serve the HTML over HTTP(S), or manually download the PDF and drag it into the app.";
      scheduleRender();
      return;
    }

    item.status = "downloading";
    item.progress = 0;
    item.errorClass = null;
    item.errorMessage = null;
    item.abortController = new AbortController();
    scheduleRender();

    try {
      const response = await fetch(item.remoteUrl, { signal: item.abortController.signal });
      const responseError = classifyResponseError(response, item.remoteUrl);
      if (responseError) {
        item.status = "error";
        item.errorClass = responseError.errorClass;
        item.errorMessage = responseError.errorMessage;
        return;
      }

      const contentType = response.headers.get("content-type") || "";
      const contentLength = Number(response.headers.get("content-length")) || 0;
      const reader = response.body && response.body.getReader ? response.body.getReader() : null;
      const chunks = [];
      let received = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          chunks.push(value);
          received += value.byteLength;
          item.progress = contentLength ? Math.min(100, Math.round((received / contentLength) * 100)) : 0;
          scheduleRender();
        }
      } else {
        const buffer = await response.arrayBuffer();
        chunks.push(new Uint8Array(buffer));
        received = buffer.byteLength;
      }

      const bytes = new Uint8Array(received);
      let offset = 0;
      chunks.forEach((chunk) => {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      });

      const looksLikePdf = /pdf/i.test(contentType) || /\.pdf(\?|#|$)/i.test(item.remoteUrl) || isLikelyPdf(bytes);
      if (!looksLikePdf) {
        item.status = "error";
        item.errorClass = "notPdf";
        item.errorMessage = "Downloaded response does not appear to be a PDF.";
        return;
      }

      const blob = new Blob([bytes], { type: "application/pdf" });
      item.blob = blob;
      item.size = blob.size;
      item.status = "ready";
      item.progress = 100;
      item.fileName = item.fileName || (new URL(item.remoteUrl).pathname.split("/").pop() || "downloaded.pdf");

      if (!item.metadata) {
        syncExtractedForItem(item);
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        item.status = "canceled";
        item.errorClass = "canceled";
        item.errorMessage = "Download canceled by user.";
      } else if (error instanceof TypeError) {
        item.status = "error";
        item.errorClass = "network";
        item.errorMessage =
          "Network request failed. This can indicate a CORS restriction, offline connection, or a blocked remote host.";
      } else {
        item.status = "error";
        item.errorClass = "network";
        item.errorMessage = "Download failed before the PDF could be loaded.";
      }
    } finally {
      item.abortController = null;
      scheduleRender();
      state.downloadManager.activeCount = Math.max(0, state.downloadManager.activeCount - 1);
      pumpDownloads();
    }
  }

  function pumpDownloads() {
    while (state.downloadManager.activeCount < state.downloadManager.concurrency) {
      const next = state.queueItems.find((item) => item.status === "queued" && item.remoteUrl);
      if (!next) {
        break;
      }
      state.downloadManager.activeCount += 1;
      downloadItem(next);
    }
  }

  function startDownloads() {
    state.downloadManager.concurrency = clampConcurrency(elements.downloadConcurrency.value);
    pumpDownloads();
  }

  function clampConcurrency(value) {
    const number = Number(value) || 3;
    return Math.min(8, Math.max(1, number));
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
        if (item.remoteUrl && item.status === "queued") {
          actions.push(`<button type="button" class="small secondary" data-action="download" data-id="${item.id}">Download</button>`);
        }
        if (item.abortController) {
          actions.push(`<button type="button" class="small secondary" data-action="cancel" data-id="${item.id}">Cancel</button>`);
        }
        if (item.status === "error" || item.status === "canceled") {
          actions.push(`<button type="button" class="small secondary" data-action="retry" data-id="${item.id}">Retry</button>`);
        }
        if (item.remoteUrl) {
          actions.push(`<a class="buttonlike small secondary" href="${sanitizeHtml(item.remoteUrl)}" target="_blank" rel="noreferrer">Open link</a>`);
        } else if (item.detailUrl) {
          actions.push(`<a class="buttonlike small secondary" href="${sanitizeHtml(item.detailUrl)}" target="_blank" rel="noreferrer">Open detail</a>`);
        }
        actions.push(`<button type="button" class="small secondary" data-action="remove" data-id="${item.id}">Remove</button>`);

        const statusDetail = item.errorMessage
          ? `<div class="muted">${sanitizeHtml(item.errorMessage)}</div>`
          : item.status === "metadata-only"
            ? `<div class="muted">No PDF URL in CSV row. Add a PDF manually or paste the missing link.</div>`
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
            </td>
            <td>${item.progress ? `${item.progress}%` : item.status === "downloading" ? "Starting" : "-"}</td>
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
        "Remote downloads are blocked when opened from file:// in many browsers. Serve this HTML over HTTP(S), or manually download the PDF and drag it into the app.";
    } else {
      elements.remoteOriginWarning.hidden = true;
      elements.remoteOriginWarning.textContent = "";
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
    } else if (action === "cancel") {
      if (item.abortController) {
        item.abortController.abort();
      }
    } else if (action === "retry") {
      item.status = "queued";
      item.progress = 0;
      item.errorClass = null;
      item.errorMessage = null;
      scheduleRender();
    } else if (action === "download") {
      pumpDownloads();
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
    elements.downloadNowButton.addEventListener("click", startDownloads);
    elements.downloadConcurrency.addEventListener("change", () => {
      elements.downloadConcurrency.value = String(clampConcurrency(elements.downloadConcurrency.value));
      state.downloadManager.concurrency = clampConcurrency(elements.downloadConcurrency.value);
    });
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
