# Quickstart: Ingestion Local, Remote, and EFAST CSV

## Build

1. Run `npm run build`
2. Confirm `/dist/form5500-ingestor-v0.7.0.html` is the only file in `/dist`

## Manual Checks

1. Open the built HTML directly from disk.
2. Add at least 10 local PDFs through the file picker and verify queue rows appear.
3. Drop at least one PDF into the drag-and-drop zone and verify it joins the same queue.
4. Preview a local PDF and close the dialog.
5. Paste 5 remote URLs, add them to the queue, and confirm the queue explains the manual download workflow.
6. Click `Open link` for at least one queued remote reference, download the PDF in the browser, and drag the saved file into the app.
7. Upload an EFAST CSV export and confirm row-level queue entries appear.
8. Confirm CSV rows with a PDF URL show the same manual-download guidance as pasted links.
9. Confirm CSV rows without a PDF URL remain visible as `metadata-only`.
