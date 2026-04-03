# Contract: Numeric Validation and Sufficiency

## Purpose

Define the observable behavior required for participant-count and schedule-number extraction during numeric validation completion.

## Scope

- Standard Form 5500 only
- Readable text-searchable filings only
- Participant counts
- Schedule H numeric fields
- Schedule I numeric fields
- Schedule SB percentage fields

## Behavioral Contract

1. Every targeted numeric field continues to emit the existing typed container shape used by the app.
2. The field result must preserve:
   - raw evidence
   - normalized value when parsed
   - parse status
   - source label
   - source page when known
3. Numeric extraction must not promote values copied from headers, footers, table-of-contents text, or unrelated attachments as validated field results.
4. When a filing contains stand-in or masked numeric content, the field result must remain explicit that the filing is numerically insufficient for proof.
5. Schedule absence remains distinct from numeric insufficiency:
   - absent schedule -> not applicable / schedule-not-present path
   - present schedule with masked numeric content -> insufficient or missing numeric evidence
6. Re-running the same corpus must produce the same:
   - normalized targeted field values
   - field statuses
   - filing-level sufficiency classifications
7. Filing review output must distinguish masked, unresolved, failed, and not-applicable numeric states instead of collapsing them into one generic exception bucket.
8. Corpus-level review output must summarize filing sufficiency counts and targeted numeric validation counts deterministically for the same filing set.

## Validation Expectations

- A sufficient filing contributes directly to feature-completion evidence.
- A partial filing contributes only for the targeted fields with real populated evidence.
- An insufficient filing may still be useful for structural checks but must not be counted as proof that numeric extraction is complete.
