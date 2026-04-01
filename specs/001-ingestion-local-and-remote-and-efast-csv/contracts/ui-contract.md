# UI Contract: Ingestion Local, Remote, and EFAST CSV

## Inputs

- Local PDF picker accepts multiple `.pdf` files.
- CSV picker accepts one `.csv` file at a time.
- Drag-and-drop target accepts PDFs and CSVs.
- Remote URL textarea accepts one URL per line.
- Concurrency input accepts integer values from 1 to 8.

## Queue Item State Contract

- New local PDF item enters the queue as `ready`.
- New remote URL item enters the queue as `manual-download-required`.
- New CSV-derived item enters as `manual-download-required` when a PDF URL exists, otherwise `metadata-only`.
- Remote reference items do not transition through programmatic download states.

## User Messaging Contract

- The ingestion view must show a global warning that remote links are references only and must be downloaded manually.
- Remote reference items must show one explicit next-step hint for manual download and local re-ingestion.
- Metadata-only CSV rows must explain how to add a missing PDF manually.
