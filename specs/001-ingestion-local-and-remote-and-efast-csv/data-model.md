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

## RemoteReference

- `queueItemId`: owning queue item identifier
- `remoteUrl`: original user-provided link
- `detailUrl`: optional non-PDF landing page reference from CSV
- `guidanceState`: `manual-download-required | metadata-only`

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

- One `QueueItem` may reference one `RemoteReference` object when it originated from a URL or CSV row.
- One `QueueItem` may reference one `CsvRowMetadata` object.
- Every `QueueItem` maps to one extracted record used by the All years feature.
