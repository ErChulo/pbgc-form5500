# UI Contract: Ingestion Local, Remote, and EFAST CSV

## Inputs

- Local PDF picker accepts multiple `.pdf` files.
- CSV picker accepts one `.csv` file at a time.
- Drag-and-drop target accepts PDFs and CSVs.
- Remote URL textarea accepts one URL per line.
- Concurrency input accepts integer values from 1 to 8.

## Queue Item State Contract

- New local PDF item enters the queue as `ready`.
- New remote URL item enters the queue as `queued`.
- New CSV-derived item enters as `queued` when a PDF URL exists, otherwise `metadata-only`.
- Download transitions:
  - `queued -> downloading -> ready`
  - `queued -> downloading -> canceled`
  - `queued -> downloading -> error`
- Retry resets `error` or `canceled` back to `queued`.

## User Messaging Contract

- `file://` origin must show a global warning for remote downloads.
- Failed remote items must show one explicit reason and a next-step hint.
- Metadata-only CSV rows must explain how to add a missing PDF manually.
