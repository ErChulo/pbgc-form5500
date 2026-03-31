# Data Model: Ingestion Local, Remote, and EFAST CSV

## QueueItem

- `id`: stable internal ingest identifier
- `sourceType`: `localPdf | remoteUrl | remoteFromCsv`
- `displayName`: user-facing name derived from file name, URL, or CSV metadata
- `fileName`: file-like name when available
- `size`: byte size when known
- `status`: `queued | downloading | ready | metadata-only | error | canceled`
- `progress`: integer percentage for remote downloads
- `remoteUrl`: original user-provided URL when applicable
- `detailUrl`: non-PDF filing detail URL from CSV metadata when available
- `blob`: in-memory PDF Blob when available
- `metadata`: canonicalized EFAST CSV metadata when available
- `originalRow`: original CSV row object for traceability
- `errorClass`: coarse failure classification
- `errorMessage`: user-facing guidance text
- `ingestionTimestamp`: ISO timestamp for deterministic ordering and later duplicate handling

## DownloadJob

- `queueItemId`: owning queue item identifier
- `abortController`: in-flight cancel control
- `contentLength`: expected byte count when remote response supplies it
- `receivedBytes`: accumulated byte count
- `validationState`: `pending | validPdf | invalidPdf`

## CsvRowMetadata

- `planName`
- `planNumber`
- `sponsorEmployerIdentificationNumber`
- `planYearBeginDate`
- `planYearEndDate`
- `planYear`
- `filingKind`
- `receivedTimestamp`
- `participantCountTotal`
- `pdfUrl`
- `detailUrl`

## Relationships

- One `QueueItem` may own one `DownloadJob` while downloading.
- One `QueueItem` may reference one `CsvRowMetadata` object.
- Every `QueueItem` maps to one extracted record used by the All years feature.
