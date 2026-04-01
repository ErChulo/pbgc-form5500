# pbgc-form5500 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-01

## Active Technologies
- JavaScript in browser plus Node.js 24 for build/test + `pdf.js` display layer for PDF parsing and rendering; `tesseract.js` for OCR fallback; no backend services (003-full-5500-extraction)
- In-memory filing artifacts, extracted records, schema registry, and user-triggered CSV export (003-full-5500-extraction)
- JavaScript for modern browsers; Node.js 24 for build and tests + No runtime dependencies; built-in browser APIs and Node built-ins only (004-numeric-schedule-validation)
- In-memory browser state only; exported files on explicit user action (004-numeric-schedule-validation)

- JavaScript running in modern browsers; Node.js 24 for build and test + No runtime dependencies; built-in browser and Node modules only (001-ingestion-local-and-remote-and-efast-csv)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

JavaScript running in modern browsers; Node.js 24 for build and test: Follow standard conventions

## Recent Changes
- 004-numeric-schedule-validation: Added JavaScript for modern browsers; Node.js 24 for build and tests + No runtime dependencies; built-in browser APIs and Node built-ins only
- 003-full-5500-extraction: Added JavaScript in browser plus Node.js 24 for build/test + `pdf.js` display layer for PDF parsing and rendering; `tesseract.js` for OCR fallback; no backend services

- 001-ingestion-local-and-remote-and-efast-csv: Added JavaScript running in modern browsers; Node.js 24 for build and test + No runtime dependencies; built-in browser and Node modules only

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
