# Phase 12 — Testing & QA Execution Checklist

Document ID: RR-DEV-012 Phase 12 execution artifact  
Sources: RR-DEV-012 §6 (Phase 12), RR-TEST-010 §6/§17, RR-DEP-011 §13.2

## 1) Automated baseline verification (local)

Run from `apps/web`:

```bash
npm run lint
npm run build
npm test
```

Expected:

- selftests pass (`test:*`)
- bundle scan finds no `GEMINI_*` / `SUPABASE_SERVICE_ROLE_KEY`

### Automated run log

| Check | Result | Notes |
| --- | --- | --- |
| `npm run lint` | ☑ Pass | 2026-07-12 local run; only existing fast-refresh warnings |
| `npm run build` | ☑ Pass | 2026-07-12 local run; Vite chunk-size advisory only |
| `npm test` | ☑ Pass | 2026-07-12 local run; all selftests + bundle scan passed |

---

## 2) CP-28 security sweep checklist

| Item | Status | Evidence |
| --- | --- | --- |
| No Gemini/service-role usage in `apps/web` runtime code | ☑ Pass | `npm run test:bundle-secrets` |
| ErrorObject remains safe (no stack/secret leaks) | ☑ Pass | `npm run test:errors` |
| `audit_logs` payloads avoid raw resume text / PII dumps | ☑ Pass | Reviewed `services/resume-processing/persist/index.ts` payload fields |
| Cross-user denial scenarios documented (AUTHZ suite) | ◑ In progress | Section 4 checklist contains `TC-AUTHZ-001..008` |

---

## 3) CP-30 fixture/seed readiness

| Requirement | Status | Evidence |
| --- | --- | --- |
| Demo seed script present under `supabase/seed` | ☑ Done | `001_phase12_demo_dataset.sql` |
| Supports ≥20 resume fixture paths | ☑ Done | `test-fixtures/resumes/paths.txt` |
| Synthetic/non-PII fixture guidance | ☑ Done | `test-fixtures/resumes/README.md` |

---

## 4) CP-32 manual P0 execution checklist (required IDs)

### Auth (`TC-AUTH-*`)

- [ ] TC-AUTH-001
- [ ] TC-AUTH-002
- [ ] TC-AUTH-004
- [ ] TC-AUTH-005
- [ ] TC-AUTH-006
- [ ] TC-AUTH-007
- [ ] TC-AUTH-009

### Authorization (`TC-AUTHZ-001..008`)

- [ ] TC-AUTHZ-001
- [ ] TC-AUTHZ-002
- [ ] TC-AUTHZ-003
- [ ] TC-AUTHZ-004
- [ ] TC-AUTHZ-005
- [ ] TC-AUTHZ-006
- [ ] TC-AUTHZ-007
- [ ] TC-AUTHZ-008

### Upload status contract

- [ ] TC-UPL-009 (upload must not enqueue; status remains `uploaded`)

### Screening command lifecycle (`TC-SCR-*`)

- [ ] TC-SCR-001
- [ ] TC-SCR-002
- [ ] TC-SCR-003
- [ ] TC-SCR-004
- [ ] TC-SCR-005
- [ ] TC-SCR-006
- [ ] TC-SCR-007
- [ ] TC-SCR-008
- [ ] TC-SCR-009
- [ ] TC-SCR-010

### AI validation/behavior (`TC-AI-001..012`)

- [ ] TC-AI-001
- [ ] TC-AI-002
- [ ] TC-AI-003
- [ ] TC-AI-004
- [ ] TC-AI-005
- [ ] TC-AI-006
- [ ] TC-AI-007
- [ ] TC-AI-008
- [ ] TC-AI-009
- [ ] TC-AI-010
- [ ] TC-AI-011
- [ ] TC-AI-012

### Acceptance-gate wrappers (`TC-AC-*`)

- [ ] TC-AC-001
- [ ] TC-AC-002
- [ ] TC-AC-003
- [ ] TC-AC-004

---

## 5) Full P0 suite completion tracker

Use RR-TEST-010 §6 as source of truth (all rows with priority `P0`).

| Suite | P0 Count | Status |
| --- | --- | --- |
| AUTH | 7 | ☐ Pending |
| AUTHZ | 8 | ☐ Pending |
| JOB | 8 | ☐ Pending |
| ARC | 4 | ☐ Pending |
| UPL | 10 | ☐ Pending |
| PRS | 3 | ☐ Pending |
| CE | 2 | ☐ Pending |
| SCR | 10 | ☐ Pending |
| AI | 11 | ☐ Pending |
| RTY | 4 | ☐ Pending |
| RNK | 5 | ☐ Pending |
| ANL | 2 | ☐ Pending |
| API | 4 | ☐ Pending |
| DB | 7 | ☐ Pending |
| SEC | 5 | ☐ Pending |
| AC | 4 | ☐ Pending |
| **Total** | **93** | ☐ Pending |

---

## 6) Defect log (Phase 12 blocker fixes only)

| Defect ID | Severity | Test ID(s) | Status | Fix commit |
| --- | --- | --- | --- | --- |
| *(none yet)* |  |  |  |  |

---

## 7) Exit criteria

- [ ] P0 cases: 93/93 pass
- [ ] AUTHZ suite (`TC-AUTHZ-001..008`) fully pass
- [ ] No open blocker/critical defects
- [ ] Ready for Phase 13 deploy smoke (DEP §13.2 / AC-G10)
