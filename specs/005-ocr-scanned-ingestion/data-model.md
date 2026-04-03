# Data Model: OCR Scanned Filing Ingestion

## Entity: Scanned Filing Input

**Purpose**: Represents an ingested standard Form 5500 PDF that does not provide enough embedded text for the native extraction path.

**Fields**:
- `ingestId`: Stable queue identifier
- `fileName`: User-visible filing label
- `pageCount`: Number of PDF pages
- `textSource`: `none`, `native`, or `mixed`
- `pages`: Ordered list of page descriptors with extracted text and optional raster image data

**Validation Rules**:
- OCR fallback is only eligible when native document text is missing or insufficient
- Page ordering must remain stable through OCR and downstream extraction

## Entity: OCR Recovery Result

**Purpose**: Represents the filing-level outcome of an OCR attempt over one scanned filing.

**Fields**:
- `status`: `ok`, `ocr-manual-review`, or `ocr-unavailable`
- `message`: Reviewer-facing outcome summary
- `confidence`: Filing-level average OCR confidence when available
- `text`: Concatenated OCR text used for downstream extraction
- `pages`: Ordered OCR page results containing `pageNumber`, `text`, and `confidence`

**Validation Rules**:
- `status = ok` requires non-empty recovered text
- `status = ocr-manual-review` preserves the filing but signals insufficient OCR recovery
- OCR text may recover only visible text; it must not invent field values

## Entity: OCR Review State

**Purpose**: Extends the filing queue state with OCR-specific review context.

**Fields**:
- `sourceKind`: `native` or `ocr`
- `ocrStatus`: Copy of the OCR recovery status when OCR ran
- `ocrConfidence`: Filing-level confidence hint for the queue row
- `exceptionCount`: Count of unresolved field exceptions after extraction
- `reviewMessage`: User-visible status text in the queue

**Validation Rules**:
- OCR-derived filings must remain compatible with the existing typed extraction summary
- OCR confidence is advisory and cannot override parse failures or unresolved exceptions

## Relationships

- One `Scanned Filing Input` may produce one `OCR Recovery Result`
- One `OCR Recovery Result` feeds the existing typed extraction pipeline
- One extracted filing record may include one `OCR Review State`
