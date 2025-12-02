# Lead Management (Redesigned)

This backend implements a streamlined Lead Management with:

- Manual creation
- CSV import (sample at `tools/sample-leads.csv`)
- API ingestion endpoint
- Manual and auto assignment (round-robin per center)
- Full lead history tracking
- Percentage-based lead score (status- or actions-driven)
- User-defined “Lead Views” (saved columns + filters)
- Field toggles via Custom Fields (Definitions for `entityType=lead` with `isSystem` and `active`)

## API Quick Reference

- POST /leads
  - Body: CreateLeadDto (required: firstName, lastName, email, mobileNumber)
  - Auto-generates referenceNo (10 digits)
  - Auto-assigns owner for Center Managers when none provided

- POST /leads/import-csv (multipart/form-data)
  - Field: `file` (CSV). See `backend/tools/sample-leads.csv` for headers.
  - Returns: { imported, errors, rows }

- POST /leads/integrations/ingest
  - Same body as create; use Bearer JWT

- GET /leads/:id/history
  - Returns linear history of status/owner/score/import/comment events

- GET /leads/views
- POST /leads/views
- PATCH /leads/views/:id
- DELETE /leads/views/:id

## Mandatory Fields and Constraints

- First Name, Last Name, Email, Mobile Number are mandatory on creation.
- Counselors cannot edit the above core fields (server-enforced).
- Lead score (`leadScorePercent`) is computed as the max of status score and provided `actionsScore` (0–100).

## Field Enable/Disable (Settings)

Use the Custom Fields API for `entityType=lead` to toggle fields.
- System fields (`isSystem=true`) map to entity columns via `targetField`.
- Use PATCH /custom-fields/definitions/:id to set `active` true/false.

## Notes

- A DB migration `1730640000000-redesign-leads.ts` adds the new columns and support tables.
- The dynamic view `leads_dynamic` is kept up to date by the Custom Fields Schema Sync service.
