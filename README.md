# pbgc-form5500
Scrapes the information contents of Form 5500 reports

```txt
Next time, reopen the repo and start from the current feature branch context: 003-full-5500-extraction.

  Use this sequence:

  1. git status
  2. Confirm you are on 003-full-5500-extraction
  3. Open specs/003-full-5500-extraction/tasks.md
  4. Open specs/003-full-5500-extraction/quickstart.md
  5. Run:

  npm test
  npm run build

  6. Open dist/form5500-ingestor-v0.7.0.html and continue the manual validation / extraction-gap review

  To resume with me efficiently, paste something like:

  Resume Feature 003 on branch 003-full-5500-extraction.
  Start from specs/003-full-5500-extraction/tasks.md and continue implementation/validation from the current repo state.

  If you want a more exact checkpoint, the current state is:

  - real text-native PDF extraction is wired in
  - OCR is not fully embedded; fallback is manual pre-conversion guidance
  - tests/build pass
  - the next meaningful work item is browser validation plus field-coverage refinement for real 5500 samples
```