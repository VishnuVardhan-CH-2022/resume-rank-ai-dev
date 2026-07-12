# Phase 13 — Deployment Smoke Report Template

Document ID: RR-DEP-011 §13.2 / §19 execution report  
Environment: `preview` / `production`  
URL tested: `<https://...>`  
Date: `<yyyy-mm-dd>`  
Tester: `<name>`

## AC-G smoke matrix

| Gate | Scenario | Status (Pass/Fail/Blocked) | Evidence (URL/screenshot/log) | Notes |
| --- | --- | --- | --- | --- |
| AC-G01 | Signup/in/out; protected routes blocked when logged out |  |  |  |
| AC-G02 | Create job with JD |  |  |  |
| AC-G03 | Upload PDF/DOCX; reject TXT |  |  |  |
| AC-G04 | Start Screening returns 202 and enqueues |  |  |  |
| AC-G05 | Ranking sorted by score DESC |  |  |  |
| AC-G06 | Candidate detail shows score/rationale/summary |  |  |  |
| AC-G07 | Mixed-batch isolation (one failure does not block siblings) |  |  |  |
| AC-G08 | Dashboard/analytics counts match owner data |  |  |  |
| AC-G09 | Bundle has no Gemini/service-role secrets; storage not public |  |  |  |
| AC-G10 | Target environment URL fully operational over HTTPS |  |  |  |

## Additional contract checks

| Test ID | Requirement | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| TC-UPL-009 | Upload does not auto-enqueue (`uploaded` only) |  |  |  |
| TC-SCR-002 | 202 body contains no score/rationale/summary |  |  |  |
| TC-AUTHZ-002 | Cross-user job read denied |  |  |  |
| TC-AUTHZ-003 | Cross-user upload denied |  |  |  |
| TC-AUTHZ-004 | Cross-user screen denied |  |  |  |
| TC-AUTHZ-005 | Cross-user signed resume denied |  |  |  |

## Production checklist (DEP §19 summary)

| Item | Status | Notes |
| --- | --- | --- |
| Env split correct (`VITE_*` only on Vercel) |  |  |
| Migrations/RLS/views applied |  |  |
| Storage `resumes` private + policies active |  |  |
| Edge functions + secrets deployed |  |  |
| Rate-limit defaults enabled |  |  |
| Monitoring channels confirmed |  |  |
| Backup/restore notes reviewed |  |  |
| Release tag created |  |  |

## Open defects / residual risk

| ID | Severity | Description | Owner | Mitigation |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
