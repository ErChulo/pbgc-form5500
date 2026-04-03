# Tasks: OCR Scanned Filing Ingestion

## Phase 1: Build plumbing

- [x] T001 Embed OCR runtime assets into the single-file build in [`scripts/build.js`](/workspaces/pbgc-form5500/scripts/build.js)
- [x] T002 Vendor English OCR language data in [`assets/tessdata/eng.traineddata.gz`](/workspaces/pbgc-form5500/assets/tessdata/eng.traineddata.gz)
- [x] T003 Rasterize textless PDF pages for OCR input in [`src/lib/extraction/pdf-source.js`](/workspaces/pbgc-form5500/src/lib/extraction/pdf-source.js)

## Phase 2: OCR fallback execution

- [x] T004 Replace placeholder OCR guidance with a real local OCR worker path in [`src/lib/extraction/ocr-pipeline.js`](/workspaces/pbgc-form5500/src/lib/extraction/ocr-pipeline.js)
- [x] T005 Seed vendored language data into browser-local cache before OCR worker creation in [`src/lib/extraction/ocr-pipeline.js`](/workspaces/pbgc-form5500/src/lib/extraction/ocr-pipeline.js)
- [x] T006 Feed OCR-recovered text back into the existing extraction workflow in [`src/app.js`](/workspaces/pbgc-form5500/src/app.js)

## Phase 3: Review flow and regressions

- [ ] T007 Surface OCR completion and manual-review messaging clearly in the queue UI in [`src/app.js`](/workspaces/pbgc-form5500/src/app.js)
- [ ] T008 Add deterministic OCR fallback regressions in [`tests/extraction.test.js`](/workspaces/pbgc-form5500/tests/extraction.test.js)
- [ ] T009 Run `npm test` and `npm run build`, then manually validate the scanned 2015 fixture in the browser build

## Phase 4: Follow-up hardening

- [ ] T010 Add mixed native/OCR page coverage if real fixtures expose collisions
- [ ] T011 Expand OCR review metadata in all-years or export views only if the queue flow proves insufficient
