# Data Model: Full 5500 Extraction

## FilingSourceArtifact

- `ingestId`: stable queue identifier
- `blob`: uploaded PDF Blob
- `documentFingerprint`: stable document identity hash or fingerprint
- `pageCount`: number of pages
- `detectedFilingYear`: extracted filing year used to choose the schema slice
- `scheduleSet`: schedule types detected in the filing package
- `textAvailability`: `native-text | ocr-required | unreadable`

## HistoricalSchemaSlice

- `instructionsYear`: integer
- `formFamily`: `Form 5500`
- `scheduleCode`: nullable schedule identifier
- `fieldDefinitions`: ordered field definition set for that year/schedule slice
- `detectionRules`: year- and schedule-identification hints

## FieldEvidence

- `fieldId`
- `pageNumber`
- `sourceText`
- `boundingRegion`: optional page region
- `evidenceKind`: `native-text | ocr-text | heuristic`
- `confidence`: nullable numeric confidence score

## FieldExtractionResult

- `fieldId`
- `fieldValue`: typed field container
- `locationRef`
- `evidence`: one or more `FieldEvidence` items
- `applicability`: `applicable | not-applicable`

## OcrJob

- `pageNumber`
- `imageBitmap`: rasterized page image or region
- `languageSet`: OCR language configuration
- `status`: `queued | running | completed | failed`
- `confidenceSummary`

## FilingYearExtractionRecord

- `ingestId`
- `planName`
- `planNumber`
- `sponsorEmployerIdentificationNumber`
- `planYearBeginDate`
- `planYearEndDate`
- `filingKind`
- `receivedTimestamp`
- `fields`
- `fieldEvidenceById`
- `exceptions`
- `metrics`
- `ingestionTimestamp`

## ExtractionException

- `scope`: `field | schedule | filing`
- `scopeId`
- `reasonCode`: `missing-text | ocr-insufficient | schedule-not-present | ambiguous-match | unsupported-family | parse-failed`
- `message`
- `recommendedAction`

## Relationships

- One `FilingSourceArtifact` yields one `FilingYearExtractionRecord`.
- One `HistoricalSchemaSlice` governs many `FieldExtractionResult` items for a
  filing year and schedule type.
- One `FieldExtractionResult` may reference multiple `FieldEvidence` items.
- One `FilingYearExtractionRecord` may contain many `ExtractionException` items.
