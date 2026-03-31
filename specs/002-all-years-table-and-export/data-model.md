# Data Model: All Years Table and Export

## SchemaRegistryEntry

- `fieldId`: stable string identifier
- `name`: canonical code and default CSV header key
- `headerLabel`: visible label
- `dataType`: `text | integer | decimal | currency | percent | date | boolean | code`
- `locationRef`: object with `form`, `schedule`, `part`, `line`, `instructionsYear`
- `exportGroup`: grouping string such as `allYears`
- `exportOrder`: stable integer order
- `constraints`: optional validation hints
- `sourceMap`: optional source-system metadata

## FieldValue

- `rawText`
- `valueType`
- `valueText`
- `valueNumber`
- `valueDate`
- `valueBoolean`
- `valueCode`
- `parseStatus`
- `parseNotes`

## Extracted

- `ingestId`
- `planName`
- `planNumber`
- `sponsorEmployerIdentificationNumber`
- `planYearBeginDate`
- `planYearEndDate`
- `filingKind`
- `receivedTimestamp`
- `fields`
- `metrics`
- `ingestionTimestamp`

## Aggregation Rules

- Group by `planYearBeginDate|planYearEndDate` when either date exists.
- If both dates are missing, group by `unknown|ingestId` so unrelated rows do not collapse.
- Preferred filing order:
  - newest `receivedTimestamp`
  - then filing kind score
  - then newest `ingestionTimestamp`
