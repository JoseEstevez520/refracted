---
type: api-doc
version: "3.0"
created: 2026-05-10
modified: 2026-07-14

facts:
  - id: rate-limit
    value: 100
    unit: req/min
  - id: timeout
    value: 30
    unit: seconds
  - id: max-payload
    value: 1
    unit: MB
  - id: sla-uptime
    value: "99.9%"

roles:
  developer: [core, impl]
  qa:        [core, impl, testing]
  manager:   [core, status]
---

<!-- @role: core -->
# POST /api/v3/documents/analyze

Analyzes a document and returns structured metadata including detected type, language,
and entity summary.

**Endpoint:** `https://api.example.com/v3/documents/analyze`
**Auth:** Bearer token (OAuth 2.0)
**Rate limit:** 100 req/min per token
<!-- @/role -->

<!-- @role: core impl -->
## Request

```http
POST /api/v3/documents/analyze HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_id": "doc_abc123",
  "options": {
    "extract_entities": true,
    "detect_language": true,
    "summary_length": "short"
  }
}
```

### Parameters

| Field              | Type    | Required | Description                            |
|--------------------|---------|----------|----------------------------------------|
| document_id        | string  | yes      | ID returned by the upload endpoint     |
| options.extract_entities | bool | no  | Extract named entities (default: false)|
| options.detect_language  | bool | no  | Auto-detect language (default: true)   |
| options.summary_length   | enum | no  | `short` \| `medium` \| `long`          |

## Response

```json
{
  "status": "ok",
  "document_id": "doc_abc123",
  "type": "contract",
  "language": "en",
  "pages": 12,
  "entities": {
    "persons": ["Jane Doe", "Acme Corp"],
    "dates": ["2026-01-01", "2026-12-31"],
    "amounts": ["$50,000"]
  },
  "summary": "Annual service agreement between Jane Doe and Acme Corp..."
}
```

### Error codes

| Code | Meaning                                      |
|------|----------------------------------------------|
| 400  | Malformed request body                       |
| 401  | Invalid or expired token                     |
| 404  | document_id not found                        |
| 413  | Document exceeds 1 MB limit                  |
| 429  | Rate limit exceeded                          |
| 500  | Internal error — retry with exponential back-off |
<!-- @/role -->

<!-- @role: testing -->
## QA Notes

### Test cases

- `TC-001` Happy path: valid document, all options enabled → 200 + full response
- `TC-002` Missing document_id → 400 with `"error": "document_id required"`
- `TC-003` Expired Bearer token → 401
- `TC-004` document_id that doesn't belong to the token owner → 404
- `TC-005` Payload > 1 MB → 413
- `TC-006` 101st request within 60 seconds → 429 with `Retry-After` header
- `TC-007` Concurrent requests (load): 50 req/s for 60 seconds → no 5xx

### Known issues

- `summary_length: "long"` adds ~2 seconds to p95 latency (tracked in ENG-2041)
- Language detection accuracy drops below 80% for documents under 200 words
<!-- @/role -->

<!-- @role: status -->
## Service Status

Current production status: **stable**

| Metric        | Value  | SLA     |
|---------------|--------|---------|
| Uptime (30d)  | 99.97% | 99.9%   |
| p50 latency   | 320ms  | —       |
| p95 latency   | 890ms  | < 2000ms|
| Error rate    | 0.03%  | < 0.1%  |

Last incident: 2026-06-12 (15-minute degraded performance, DNS misconfiguration).
Post-mortem: [INC-2026-06-12].

**Next planned maintenance:** 2026-08-01 02:00–04:00 UTC. Expected downtime: 0 (rolling
deploy, no API interruption).
<!-- @/role -->

[rel:documents_upload]: # "upload endpoint — must call this before analyze"
[rel:auth_guide]: # "how to obtain and refresh Bearer tokens"
[rel:api_changelog]: # "breaking changes in v3: removed v2 'format' parameter"
