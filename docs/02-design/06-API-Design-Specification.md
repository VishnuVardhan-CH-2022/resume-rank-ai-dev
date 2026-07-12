# ResumeRank AI

# API Design Specification (ADS)

**Document 06 — RR-API-006**

---

## Cover Page

| | |
| --- | --- |
| **Project Name** | ResumeRank AI |
| **Document Title** | API Design Specification |
| **Document Number** | Document 06 |
| **Document ID** | RR-API-006 |
| **Version** | 1.0.0 |
| **Status** | Baseline — Ready for UI/UX Design |
| **Classification** | Internal — MBA Final Year Project |
| **Specialization** | Artificial Intelligence & Data Science |
| **Document Type** | API Design (REST / Supabase / Async Processing) |
| **Author** | Vish Var |
| **Role** | Principal API Architect / Project Lead |
| **Organization** | ResumeRank AI Development Team |
| **Prepared For** | Development, QA, and Academic Evaluation Teams |
| **Date** | 12 July 2026 |
| **Upstream Dependencies** | RR-ARCH-001 v2.0.0; RR-PRD-002 v1.0.0; RR-SRS-003 v1.1.0; RR-SDD-004 v1.1.0; RR-DB-005 v1.1.0 |
| **Governing Plan** | Documentation Roadmap (RR-DOC-000) |
| **Next Document** | UI/UX Design Document (RR-UIX-007) |

---

### Document Control Statement

This API Design Specification defines the **conceptual REST and Supabase API surface** for ResumeRank AI: authentication, job management, resume upload, candidates, asynchronous AI screening, analytics, errors, security, and contracts.

It derives entirely from the approved Architecture, PRD, SRS v1.1, SDD v1.1, and DDD v1.1. It does **not** invent undocumented product features and does **not** modify business rules BR-01–BR-12.

This is a **design** document: it does not contain implementation code, OpenAPI/Swagger YAML, SQL, or Supabase policy SQL. Those belong to development.

---

## Version History

| Version | Date | Author | Description of Change | Review Status |
| --- | --- | --- | --- | --- |
| 0.1.0 | 12 July 2026 | Vish Var | Outline from SDD §8 and DDD Appendix B open items | Draft |
| 1.0.0 | 12 July 2026 | Vish Var | Complete API design: endpoints, async 202 contracts, schemas, diagrams, traceability, and API Architecture Review | Current |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [API Design Principles](#2-api-design-principles)
3. [API Architecture](#3-api-architecture)
4. [Authentication APIs](#4-authentication-apis)
5. [Job Management APIs](#5-job-management-apis)
6. [Resume Upload APIs](#6-resume-upload-apis)
7. [Candidate APIs](#7-candidate-apis)
8. [AI Processing APIs](#8-ai-processing-apis)
9. [Dashboard & Analytics APIs](#9-dashboard--analytics-apis)
10. [Error Handling](#10-error-handling)
11. [Security](#11-security)
12. [API Versioning](#12-api-versioning)
13. [Performance](#13-performance)
14. [Sequence Diagrams](#14-sequence-diagrams)
15. [API Contracts](#15-api-contracts)
16. [Traceability Matrix](#16-traceability-matrix)
17. [Future APIs](#17-future-apis)
18. [Conclusion](#18-conclusion)
19. [API Architecture Review](#19-api-architecture-review)
20. [Appendices](#20-appendices)

---

## List of Figures

| Figure | Title | Section |
| --- | --- | --- |
| F-01 | API Architecture Overview | §3.1 |
| F-02 | Authentication Flow | §3.3 |
| F-03 | Request Lifecycle | §3.5 |
| F-04 | Upload Flow | §6.6 |
| F-05 | Async AI Processing | §8.1 |
| F-06 | Sequence — Authentication | §14.1 |
| F-07 | Sequence — Create Job | §14.2 |
| F-08 | Sequence — Resume Upload | §14.3 |
| F-09 | Sequence — AI Screening | §14.4 |
| F-10 | Sequence — Candidate Ranking | §14.5 |
| F-11 | Sequence — Analytics Retrieval | §14.6 |

---

## List of Tables

| Table | Title | Section |
| --- | --- | --- |
| T-01 | API surface inventory | §3.2 |
| T-02 | Authoritative status vocabulary | §1.8 |
| T-03 | Operational defaults (API-relevant) | §13.1 |
| T-04 | Standard error object | §10.1 |
| T-05 | HTTP status mapping | §10.8 |
| T-06 | Traceability matrix | §16 |
| T-07 | API design decisions | §20.A |
| T-08 | Architecture review findings | §19 |

---

## References

| ID | Reference |
| --- | --- |
| REF-01 | RR-DOC-000 Documentation Roadmap |
| REF-02 | RR-ARCH-001 Project Architecture v2.0.0 |
| REF-03 | RR-PRD-002 Product Requirements Document v1.0.0 |
| REF-04 | RR-SRS-003 Software Requirements Specification v1.1.0 |
| REF-05 | RR-SDD-004 System Design Document v1.1.0 |
| REF-06 | RR-DB-005 Database Design Document v1.1.0 |
| REF-07 | Supabase Auth, PostgREST, Storage conceptual documentation |

---

## 1. Introduction

### 1.1 Purpose

Define a production-oriented API design for ResumeRank AI that enables the React SPA to authenticate HR users, manage jobs, upload resumes, observe asynchronous AI screening, rank candidates, and retrieve analytics — while keeping Gemini secrets and privileged processing off the client.

### 1.2 Scope

**In scope:** Conceptual REST/resource contracts; Supabase Auth/PostgREST/Storage interaction patterns; Resume Processing Service enqueue/retry (**HTTP 202**); polling; error model; security; versioning; performance tactics; JSON contracts; traceability.

**Out of scope:** OpenAPI/Swagger generation, client/server source code, SQL/RLS policy SQL, prompt text (RR-AI-008), pixel UI (RR-UIX-007), synchronous screening.

### 1.3 Objectives

| Objective | API Response |
| --- | --- |
| Async-only screening | **202 Accepted** + poll; never return scores on upload |
| Owner isolation | JWT + ownership checks + RLS |
| Human-in-the-loop | No auto-reject/hire endpoints |
| Traceability | Every endpoint maps to PRD/SRS/SDD/DDD |
| Implementability | Aligns to Supabase + Resume Processing Service |

### 1.4 API Overview

ResumeRank AI exposes **three collaborating API surfaces**:

| Surface | Role | Consumer |
| --- | --- | --- |
| **Supabase Auth API** | Sign-up, sign-in, sign-out, session/refresh | SPA |
| **Supabase Data/Storage API** | CRUD/read on tables/views; private resume objects | SPA (JWT + RLS) |
| **Resume Processing Service API** | Enqueue/retry screening (**202**); never exposes Gemini | SPA (JWT); workers internal |

### 1.5 Architecture Context

Derived from RR-ARCH-001 and RR-SDD-004 v1.1: SPA (React/Vite) → Supabase (Auth, PostgreSQL/PostgREST, Storage) + asynchronous Resume Processing Service → Google Gemini (server-only).

### 1.6 Intended Audience

Frontend engineers, backend/processor engineers, QA, academic evaluators, and authors of RR-UIX-007 / RR-DEV-012.

### 1.7 Definitions and Abbreviations

| Term | Definition |
| --- | --- |
| Active evaluation | Sole current evaluation row in `evaluations` for a candidate (DDD §4.6) |
| Authoritative status | Candidate status vocabulary in DDD §4.4.1 |
| Open queue entry | `processing_queue` row with status `pending` or `locked` |
| RLS | Row Level Security |
| RPS | Resume Processing Service |
| ADS | This API Design Specification |
| JWT | JSON Web Token issued by Supabase Auth |

| Abbreviation | Meaning |
| --- | --- |
| SPA | Single-Page Application |
| REST | Representational State Transfer |
| EH | Error Handling category (SRS §18) |
| CE | Candidate Extraction field (CE-01–CE-14) |

### 1.8 Authoritative Status Vocabulary (API)

APIs **expose refined authoritative statuses** (DDD §4.4.1). Optional `status_coarse` may be included for UI labels mapped from Appendix A of DDD.

| Status | Terminal for processing? |
| --- | --- |
| `uploaded` | No |
| `queued` | No |
| `parsing` | No |
| `parsed` | No |
| `ai_processing` | No |
| `completed` | Yes |
| `failed_parse` | Yes |
| `failed_ai` | Yes (retryable) |
| `archived` | Yes for processing |

**Decision API-06 (frozen):** Responses use refined statuses as primary; do not persist SRS-only labels (`pending`/`processing`) as DB/API truth.

---

## 2. API Design Principles

| Principle | Application |
| --- | --- |
| RESTful conventions | Noun resources; standard HTTP verbs; meaningful status codes |
| Resource-oriented design | Jobs, candidates, evaluations, analytics views as resources |
| Idempotency | Enqueue/retry with idempotency keys; one open queue entry per candidate |
| Statelessness | Each request carries JWT; no server session store beyond Auth |
| Consistency | Same field names as DDD entities; same status enum |
| Versioning | URI/header strategy §12; v1 baseline |
| Error standardization | Single error object §10 |
| Security-first | AuthN/AuthZ on every protected call; no secrets in SPA |

---

## 3. API Architecture

### 3.1 Overview

```mermaid
flowchart LR
  SPA[React SPA] -->|Auth SDK| AUTH[Supabase Auth]
  SPA -->|JWT CRUD/read| API[PostgREST / Views]
  SPA -->|JWT upload| ST[Supabase Storage]
  SPA -->|JWT enqueue 202| RPS[Resume Processing Service]
  RPS --> Q[(processing_queue)]
  RPS --> ST
  RPS --> API
  RPS --> GEM[Google Gemini]
  API --> PG[(PostgreSQL + RLS)]
  AUTH --> PG
```

### 3.2 API Surface Inventory (T-01)

| Group | Examples | Style |
| --- | --- | --- |
| Auth | sign-in, sign-out, session, profile | Supabase Auth + `profiles` |
| Jobs | create, update, archive, delete, list, get, progress, search | PostgREST / RPC |
| Uploads | upload, batch upload, metadata, status | Storage + candidates insert + 202 |
| Candidates | list, detail, profile, ranking, filters | PostgREST / views |
| AI Processing | start screening, retry, processing status | RPS **202** + poll |
| Analytics | dashboard, job analytics, distributions | Views §10.6 DDD |
| Internal | queue claim | **Non-public** (API-02) |

### 3.3 Authentication and Authorization Flow

```mermaid
sequenceDiagram
  participant U as HR User
  participant SPA as SPA
  participant AUTH as Supabase Auth
  participant API as Data/Storage/RPS
  U->>SPA: Credentials
  SPA->>AUTH: signIn / signUp
  AUTH-->>SPA: Session + JWT
  SPA->>API: Request + Authorization Bearer JWT
  API->>API: Validate JWT + RLS / ownership
  API-->>SPA: 2xx / 4xx
```

### 3.4 Request / Response Lifecycle

```mermaid
flowchart TD
  A[Client builds request] --> B[Attach JWT if protected]
  B --> C[Validate locally where possible]
  C --> D[Send HTTPS]
  D --> E{Gateway / Auth valid?}
  E -->|No| F[401 / 403 error object]
  E -->|Yes| G[Business validation]
  G -->|Fail| H[400 / 422 EH-VAL]
  G -->|OK| I[Execute: DB / Storage / Enqueue]
  I --> J[Map result to contract]
  J --> K[2xx / 202 response]
```

---

## 4. Authentication APIs

Auth operations use **Supabase Auth** (conceptual routes below mirror SDK capabilities; exact vendor paths are implementation details).

### 4.1 Sign Up / Register

| Field | Specification |
| --- | --- |
| Purpose | Create HR user account (SRS-FR-001) |
| Method / Route | `POST /auth/v1/signup` (conceptual) |
| Authentication | None |
| Authorization | Public |
| Headers | `Content-Type: application/json`; anon key as required by platform |
| Request Body | `{ "email": string, "password": string }` |
| Response Body | Session/user object (platform shape) + ensure `profiles` row exists |
| Validation | Valid email; password meets Auth policy |
| Status Codes | `200`/`201` success; `400` validation; `422` policy |
| Business Rules | BR-01 |
| Errors | EH-AUTH, EH-VAL |

### 4.2 Sign In

| Field | Specification |
| --- | --- |
| Purpose | Authenticate existing user (SRS-FR-001) |
| Method / Route | `POST /auth/v1/token?grant_type=password` (conceptual) |
| Authentication | None |
| Request Body | `{ "email": string, "password": string }` |
| Response Body | `{ access_token, refresh_token, expires_in, user }` |
| Status Codes | `200`; `400`/`401` invalid credentials |
| Errors | EH-AUTH |

### 4.3 Sign Out

| Field | Specification |
| --- | --- |
| Purpose | Invalidate client session (SRS-FR-003) |
| Method / Route | `POST /auth/v1/logout` |
| Authentication | JWT required |
| Request Body | Empty / platform default |
| Response Body | Empty success |
| Status Codes | `204`/`200` |
| Business Rules | Subsequent protected calls must fail until re-auth |

### 4.4 Session Validation

| Field | Specification |
| --- | --- |
| Purpose | Determine if session is valid (SRS-FR-002) |
| Method / Route | `GET /auth/v1/user` |
| Authentication | JWT |
| Response Body | User identity or 401 |
| Status Codes | `200`, `401` |

### 4.5 Token Refresh

| Field | Specification |
| --- | --- |
| Purpose | Renew access token |
| Method / Route | `POST /auth/v1/token?grant_type=refresh_token` |
| Request Body | `{ "refresh_token": string }` |
| Response Body | New tokens |
| Status Codes | `200`, `401` |

### 4.6 Profile Retrieval

| Field | Specification |
| --- | --- |
| Purpose | Read application profile (DDD `profiles`) |
| Method / Route | `GET /rest/v1/profiles?id=eq.{auth.uid()}` |
| Authentication | JWT |
| Authorization | Self only (RLS) |
| Response Body | `{ id, email, full_name, created_at, updated_at }` |
| Status Codes | `200`, `401`, `404` |

---

## 5. Job Management APIs

All job APIs require JWT. Ownership enforced via `owner_user_id = auth.uid()` (BR-09).

### 5.1 Create Job

| Field | Specification |
| --- | --- |
| Purpose | Create job opening with JD (SRS-FR-005) |
| Method / Route | `POST /rest/v1/jobs` |
| Request Body | `{ "title": string, "jd_text": string }` |
| Server sets | `owner_user_id`, `lifecycle_status=active`, timestamps |
| Response Body | Job object (§15.1) |
| Validation | VR-01 title non-empty; VR-02 jd_text non-empty |
| Status Codes | `201`, `400`, `401` |
| Idempotency | Client retries may create duplicates (acceptable); optional client idempotency key future |
| Business Rules | BR-01, BR-07 |

### 5.2 Update Job

| Field | Specification |
| --- | --- |
| Purpose | Update title/JD (SRS-FR-007 Should) |
| Method / Route | `PATCH /rest/v1/jobs?id=eq.{job_id}` |
| Request Body | `{ "title"?: string, "jd_text"?: string }` |
| Validation | Non-empty if provided; **must not** change `owner_user_id` (VR-03) |
| Authorization | Owner only; prefer `active` jobs |
| Status Codes | `200`, `400`, `401`, `403`, `404` |

### 5.3 Archive Job

| Field | Specification |
| --- | --- |
| Purpose | Soft-close job (SRS-FR-046) |
| Method / Route | `PATCH /rest/v1/jobs?id=eq.{job_id}` **or** `POST /rest/v1/rpc/archive_job` |
| Request Body | `{ "lifecycle_status": "archived" }` |
| Effects | Block new uploads/screening; existing data readable; candidates **may** become `archived` (DDD §4.4.1) |
| Status Codes | `200`, `401`, `403`, `404` |
| Business Rules | BR-11 |

### 5.4 Delete Job

| Field | Specification |
| --- | --- |
| Purpose | Hard delete empty job (SRS-FR-047) |
| Method / Route | `DELETE /rest/v1/jobs?id=eq.{job_id}` |
| Preconditions | Candidate count = 0 (VR-04) |
| Response | `204` on success; `409` if candidates exist (advise to archive) |
| Business Rules | BR-11 |

### 5.5 Get Job

| Field | Specification |
| --- | --- |
| Purpose | Retrieve one owned job (SRS-FR-006) |
| Method / Route | `GET /rest/v1/jobs?id=eq.{job_id}` |
| Response Body | Job object |
| Status Codes | `200`, `401`, `403`, `404` |

### 5.6 List Jobs

| Field | Specification |
| --- | --- |
| Purpose | List owned jobs |
| Method / Route | `GET /rest/v1/jobs?select=*&order=created_at.desc` |
| Query | `lifecycle_status=eq.active` **default**; `lifecycle_status=eq.archived` for archive view |
| Pagination | `limit`, `offset` or Range headers |
| Response | Job array |

### 5.7 Job Progress

| Field | Specification |
| --- | --- |
| Purpose | Aggregate status counts for a job (SRS-FR-038; DDD Job Progress Summary) |
| Method / Route | `GET /rest/v1/job_progress_summary?job_id=eq.{job_id}` |
| Response Body | See §15.5 / §9.2 |
| Status Codes | `200`, `401`, `403`, `404` |

### 5.8 Search Jobs

| Field | Specification |
| --- | --- |
| Purpose | Filter owned jobs by title substring (supports SRS-FR-006 UX) |
| Method / Route | `GET /rest/v1/jobs?title=ilike.*{q}*&lifecycle_status=eq.active` |
| Validation | Query length reasonable; owner-scoped |
| Notes | Not full-text search engine; PostgREST filter sufficient for v1 |

---

## 6. Resume Upload APIs

### 6.1 Rules (Cross-Cutting)

| Rule | Value | Source |
| --- | --- | --- |
| Formats | PDF, DOCX only | BR-06, SRS-FR-011 |
| Max size | **5 MB** default (configurable) | DDD §10.7, SRS-NFR-024 |
| Empty file | Reject | VR-12 |
| Batch capacity | ≥ **20** files | SRS-NFR-010 |
| Job gate | Owned + `lifecycle_status=active` | VR-05, VR-14 |
| Path | `resumes/{owner_id}/{job_id}/{candidate_id}/{filename}` | DDD §5.5 |
| Duplicate files | Allowed as **separate candidates** (DDD §9.4) | — |
| Sync scores | **Forbidden** | SDD DD-02 |

### 6.2 Upload Resume (Single)

Conceptual multi-step transaction (SPA-orchestrated or BFF):

1. Validate MIME/size  
2. Create candidate id (client or server)  
3. `POST` Storage object to standard path  
4. Insert `candidates` (`status=uploaded`) + `resume_files`  
5. Enqueue processing (or defer to explicit ST-01 per product UX)  
6. Return **202** when processing accepted  

| Field | Specification |
| --- | --- |
| Purpose | Accept one resume under a job (SRS-FR-010–014) |
| Method / Route | Composite: Storage upload + `POST /rest/v1/candidates` + RPS enqueue |
| Auth | JWT |
| Request | Multipart file + `job_id` |
| **202 Response** (API-01 frozen) | See §6.5 |
| Errors | EH-VAL, EH-STORE, EH-FORB |

### 6.3 Batch Upload

| Field | Specification |
| --- | --- |
| Purpose | Multi-file upload in one user action (SRS-FR-010, SRS-FR-017) |
| Behavior | Per-file validate → upload → persist; **partial success allowed** (BR-04) |
| Response | Array of per-file results: accepted (**202** items) and rejected (error objects) |
| Failure isolation | One file failure does not roll back siblings |

### 6.4 Upload Status / Resume Metadata

| Field | Specification |
| --- | --- |
| Purpose | Read candidate/resume metadata and processing status |
| Method / Route | `GET /rest/v1/candidates?id=eq.{id}&select=*,resume_files(*)` |
| Response | Candidate + resume_files metadata (no binary) |
| Notes | Binary download via signed Storage URL (owner policy) |

### 6.5 Compensation Strategy

| Failure | Compensation |
| --- | --- |
| Storage OK, DB insert fails | **Delete** Storage object |
| DB OK, enqueue fails | Keep candidate; log; allow ST-01 re-queue |
| Later parse/AI fail | Keep candidate; set terminal status + `failure_code` |

### 6.6 Upload Flow Diagram

```mermaid
flowchart TD
  A[Select PDF/DOCX] --> B{Valid MIME/size?}
  B -->|No| R[Per-file EH-VAL]
  B -->|Yes| C[Storage PUT path]
  C --> D{DB insert candidate + resume_files?}
  D -->|No| E[Delete Storage object]
  D -->|Yes| F[Enqueue → status queued]
  F --> G[HTTP 202 Accepted]
  G --> H[UI polls candidate status]
```

### 6.7 Frozen 202 Upload/Enqueue Payload (API-01)

```json
{
  "accepted": true,
  "job_id": "uuid",
  "candidate_id": "uuid",
  "status": "queued",
  "message": "Processing accepted"
}
```

Batch: `{ "results": [ { ...same fields..., "ok": true } | { "ok": false, "error": ErrorObject } ] }`

**Must not** include `match_score`, rationale, or summary.

---

## 7. Candidate APIs

### 7.1 List Candidates

| Field | Specification |
| --- | --- |
| Purpose | List candidates for a job (SRS-FR-028, SRS-FR-030) |
| Method / Route | `GET /rest/v1/candidates?job_id=eq.{job_id}&order=created_at.desc` |
| Query | `status=eq.{status}` filter (Should); pagination `limit`/`offset` |
| Response | Candidate summary array (§15.2) |
| AuthZ | Job owner only |

### 7.2 Candidate Details

| Field | Specification |
| --- | --- |
| Purpose | Detail with evaluation + profile (SRS-FR-029) |
| Method / Route | `GET /rest/v1/candidates?id=eq.{id}&select=*,candidate_profiles(*),evaluations(*),resume_files(*)` |
| Response | Candidate + profile + active evaluation + file metadata |
| Notes | Include `failure_code` / `failure_message` when failed |

### 7.3 Candidate Profile

| Field | Specification |
| --- | --- |
| Purpose | Structured CE-01–CE-14 fields (SRS-FR-048–050) |
| Method / Route | `GET /rest/v1/candidate_profiles?candidate_id=eq.{id}` |
| Response | Profile object (§15.3); sparse nulls allowed |

### 7.4 Candidate Status

| Field | Specification |
| --- | --- |
| Purpose | Lightweight poll field set |
| Method / Route | `GET /rest/v1/candidates?job_id=eq.{job_id}&select=id,status,failure_code,updated_at` |
| Polling | Default interval **3s** (DDD §10.7); backoff allowed (SDD §13.1) |

### 7.5 Candidate Ranking

| Field | Specification |
| --- | --- |
| Purpose | Rank completed candidates by score DESC (SRS-FR-027) |
| Method / Route | `GET /rest/v1/candidate_ranking?job_id=eq.{job_id}&order=match_score.desc` |
| Response | Ranked rows: rank, candidate_id, name, match_score, summary ref, status |
| Rules | Ranking order applies to `completed`; failed/in-progress listed separately or with null score |

### 7.6 Candidate Search / Filters

| Field | Specification |
| --- | --- |
| Purpose | Segment by status / simple name match (SRS-FR-031 Should) |
| Method / Route | Candidates list with `status=in.(...)` and optional profile name `ilike` |
| Pagination | Should (SRS-FR-032) |
| Sorting | `created_at`, or `match_score` via ranking view |

---

## 8. AI Processing APIs

**Synchronous screening is out of scope.** All screening is asynchronous (SDD v1.1).

### 8.1 Async Architecture

```mermaid
sequenceDiagram
  participant SPA
  participant RPS as Resume Processing Service
  participant Q as processing_queue
  participant W as Worker
  participant DB as PostgreSQL
  SPA->>RPS: POST screen/retry + JWT + Idempotency-Key
  RPS->>DB: Validate ownership, active job, JD, eligibility
  RPS->>Q: Insert open queue entry
  RPS->>DB: Set candidates status queued
  RPS-->>SPA: 202 Accepted
  loop Until terminal
    SPA->>DB: Poll statuses / progress view
  end
  W->>Q: Claim locked SKIP LOCKED
  W->>DB: parsing → ... → completed/failed_*
```

### 8.2 Start Screening (ST-01)

| Field | Specification |
| --- | --- |
| Purpose | Explicit run screening for eligible candidates (ST-01) |
| Method / Route | `POST /v1/jobs/{job_id}/screen` |
| Authentication | JWT |
| Authorization | Job owner; job `active`; JD present (SRS-FR-009) |
| Headers | `Authorization`, `Content-Type`, **`Idempotency-Key`** (API-05) |
| Request Body | `{ "candidate_ids"?: uuid[] }` — omit = all eligible |
| Eligibility | `uploaded`, `queued` (re-enqueue), or per product rules for not-yet-processed; **retry path uses §8.3** |
| Response | **202** with `{ job_id, accepted_candidate_ids[], status: "queued" }` |
| Side effects | One open queue entry per candidate; status → `queued` |
| Errors | `400` no eligible / missing JD; `403`; `409` open queue exists without terminal |

### 8.3 Retry Screening

| Field | Specification |
| --- | --- |
| Purpose | Re-queue `failed_ai` candidates (SRS-FR-025 Should; UC-10) |
| Method / Route | `POST /v1/jobs/{job_id}/candidates/{candidate_id}/retry` |
| Preconditions | Status `failed_ai`; job active; JD present |
| Behavior | Snapshot rules on later success (history before overwrite); **202** |
| Idempotency | Idempotency-Key; no second open queue entry |
| Errors | `409` if not `failed_ai`; `403` archived job |

### 8.4 Processing Status

| Field | Specification |
| --- | --- |
| Purpose | Observe progress (API-03) |
| Method / Route | Candidate status poll + `job_progress_summary` |
| Terminal stop | All candidates in `{completed, failed_parse, failed_ai, archived}` |

### 8.5 Evaluation Retrieval

| Field | Specification |
| --- | --- |
| Purpose | Read active evaluation (SRS-FR-023) |
| Method / Route | `GET /rest/v1/evaluations?candidate_id=eq.{id}` |
| History | `GET /rest/v1/evaluation_history?candidate_id=eq.{id}&order=archived_at.desc` |
| Rules | One active evaluation; history append-only (BR-12) |

### 8.6 Failure Handling, Retry, Audit

| Topic | Design |
| --- | --- |
| Parse failure | `failed_parse` + `failure_code`/`failure_message`; no fabricated evaluation |
| AI failure | `failed_ai`; retain prior evaluation if invalid payload |
| Success overwrite | Insert `evaluation_history` then replace `evaluations` |
| Audit logs | Operational events only; **no raw PII** (DDD §11.1) |
| Internal claim | Worker-only; **not a public API** (API-02) |

---

## 9. Dashboard & Analytics APIs

All analytics are **owner-scoped**, read-only, and map to DDD §10.6 view contracts.

### 9.1 Dashboard Summary

| Field | Specification |
| --- | --- |
| Purpose | Cross-job homepage metrics (SRS-FR-033) |
| Method / Route | `GET /rest/v1/dashboard_metrics` |
| Response | `{ active_jobs, total_candidates, completed_count, failed_count, avg_match_score }` |

### 9.2 Job Analytics / Progress

| Field | Specification |
| --- | --- |
| Purpose | Per-job progress (SRS-FR-036, SRS-FR-038) |
| Method / Route | `GET /rest/v1/job_progress_summary?job_id=eq.{job_id}` |
| Response | Counts by authoritative status; percent completed; failed totals |

### 9.3 Candidate Analytics / Screening Statistics

| Field | Specification |
| --- | --- |
| Purpose | Throughput stats (SRS-FR-034 Should) |
| Method / Route | `GET /rest/v1/screening_statistics?job_id=eq.{job_id}` |
| Response | uploaded/queued/completed/failed_parse/failed_ai counts; avg score |

### 9.4 Score Distribution

| Field | Specification |
| --- | --- |
| Purpose | Histogram buckets (SRS-FR-035 Should) |
| Method / Route | `GET /rest/v1/score_distribution?job_id=eq.{job_id}` |
| Response | `{ buckets: [ { range: "0-20", count }, ... ] }` — completed only |

### 9.5 Status Distribution

| Field | Specification |
| --- | --- |
| Purpose | Status breakdown (SRS-FR-034) |
| Method / Route | Derived from `job_progress_summary` or screening_statistics |
| Response | Map of status → count |

### 9.6 Ranking Statistics

| Field | Specification |
| --- | --- |
| Purpose | Rank list + score summary for job workspace |
| Method / Route | `candidate_ranking` + aggregates from evaluations |
| Aggregation | Avg/min/max score over completed evaluations for job |

---

## 10. Error Handling

### 10.1 Standard Error Object (T-04) — API-04 Frozen

```json
{
  "error": {
    "code": "EH-VAL",
    "message": "Human-readable safe message",
    "details": { "field": "title", "reason": "required" },
    "failure_code": null,
    "request_id": "uuid",
    "retryable": false
  }
}
```

| Field | Rules |
| --- | --- |
| `code` | One of EH-AUTH, EH-VAL, EH-FORB, EH-STORE, EH-PARSE, EH-AI, EH-SYS |
| `message` | Safe; no secrets/stack traces (EH-07) |
| `failure_code` | Populated for candidate terminal failures when applicable |
| `retryable` | Guidance for client |

### 10.2 Category Mapping

| Category | HTTP | Examples |
| --- | --- | --- |
| Validation | 400 / 422 | Empty JD, bad MIME, oversize |
| Authentication | 401 | Missing/expired JWT |
| Authorization | 403 | Another user’s job |
| Upload/Storage | 400 / 502 | Storage put failure |
| Business conflict | 409 | Delete job with candidates; retry non-failed_ai |
| AI / Parse (async) | Reflected in **resource status**, not upload 5xx after 202 | `failed_ai` / `failed_parse` |
| System | 500 / 503 | Platform outage |

### 10.3 Retryable vs Non-Retryable

| Retryable | Non-Retryable |
| --- | --- |
| Transient EH-STORE / EH-SYS / EH-AI (processor internal) | EH-VAL, EH-FORB, EH-AUTH (until re-login), unsupported MIME |
| User retry ST-01 for `failed_ai` | Fabricating scores; sync re-score in upload |

### 10.8 HTTP Status Mapping (T-05)

| HTTP | When |
| --- | --- |
| 200 | Successful read/update |
| 201 | Created (job) |
| 202 | Processing accepted (upload enqueue / screen / retry) |
| 204 | Deleted / sign-out |
| 400/422 | Validation |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not found (or masked as 403 per security preference) |
| 409 | Conflict (business rule) |
| 429 | Rate limited |
| 500/503 | System |

---

## 11. Security

| Topic | Design |
| --- | --- |
| JWT Authentication | All protected routes require valid Supabase JWT |
| Ownership validation | `jobs.owner_user_id = auth.uid()`; processor re-checks |
| RLS interaction | PostgREST relies on RLS; SPA uses anon key + user JWT only |
| Rate limiting | Platform/edge limits on Auth, upload, and `/screen` (implementation config) |
| Input validation | MIME, size, UUID format, string lengths, enum checks |
| Output validation | No service keys; no raw resume text in analytics; scores only when completed |
| File upload security | Private bucket; path prefix ownership; type sniffing beyond extension |
| Prompt injection mitigation | Processor treats resume/JD as untrusted text; no tool-calling from model to mutate unauthorized data (detail in RR-AI-008 / RR-SEC-009) |
| PII handling | Classification per DDD §11.1; audit logs never raw PII |

**Forbidden:** Gemini API key or service-role key in SPA (BR-05, SRS-SEC-002).

---

## 12. API Versioning

| Topic | Policy |
| --- | --- |
| Current version | **v1** |
| RPS routes | Prefix `/v1/...` |
| PostgREST | Unversioned resource names; breaking changes require new views or v2 prefix |
| Backward compatibility | Additive fields preferred; do not remove fields in v1 without deprecation |
| Deprecation | Announce in release notes; retain ≥1 minor cycle |
| Breaking changes | New major (`/v2`); examples: renaming status enum, removing 202 async model |

---

## 13. Performance

### 13.1 Defaults (T-03)

| Parameter | Default |
| --- | --- |
| Poll interval | 3 seconds (backoff to 10–15s if unchanged) |
| Max upload size | 5 MB |
| Batch size guidance | 20 |
| AI transient retries | 2 (processor) |
| Processor soft timeout | 60s / stage |
| Queue visibility | 90s |

### 13.2 Tactics

| Tactic | Design |
| --- | --- |
| Pagination | `limit`/`offset` or keyset on lists |
| Batch uploads | Parallel per-file with isolation |
| Async processing | 202 + poll; never block HTTP on Gemini |
| Compression | HTTPS/CDN for SPA; JSON as-is |
| Caching | Short-lived client cache; invalidate on mutations; do not cache stale statuses across poll |
| Timeouts | Client upload timeout > processor soft budget |
| Retry strategy | Idempotent enqueue with Idempotency-Key |
| Rate limiting | Protect `/screen` and Auth |

---

## 14. Sequence Diagrams

### 14.1 Authentication

```mermaid
sequenceDiagram
  participant U as User
  participant SPA
  participant AUTH as Supabase Auth
  U->>SPA: Email/password
  SPA->>AUTH: signIn
  AUTH-->>SPA: JWT + session
  SPA->>SPA: Store session securely
```

### 14.2 Create Job

```mermaid
sequenceDiagram
  participant SPA
  participant API as PostgREST
  SPA->>API: POST /jobs title+jd_text + JWT
  API->>API: RLS set owner_user_id
  API-->>SPA: 201 Job
```

### 14.3 Resume Upload

```mermaid
sequenceDiagram
  participant SPA
  participant ST as Storage
  participant API as PostgREST
  participant RPS as Processing Service
  SPA->>ST: PUT resume path
  SPA->>API: Insert candidate uploaded + resume_files
  alt DB fails
    SPA->>ST: Delete object
  else OK
    SPA->>RPS: Enqueue
    RPS-->>SPA: 202 queued
  end
```

### 14.4 AI Screening

```mermaid
sequenceDiagram
  participant SPA
  participant RPS
  participant DB
  SPA->>RPS: POST /v1/jobs/{id}/screen
  RPS->>DB: Validate + enqueue + queued
  RPS-->>SPA: 202
  loop Poll
    SPA->>DB: GET candidates status / progress
  end
```

### 14.5 Candidate Ranking

```mermaid
sequenceDiagram
  participant SPA
  participant API as candidate_ranking view
  SPA->>API: GET by job_id order score desc
  API-->>SPA: Ranked rows
```

### 14.6 Analytics Retrieval

```mermaid
sequenceDiagram
  participant SPA
  participant V as dashboard_metrics / distributions
  SPA->>V: GET owner-scoped views
  V-->>SPA: Aggregates
```

---

## 15. API Contracts

Conceptual JSON schemas (not OpenAPI). Field sets align to DDD tables/views.

### 15.1 Job

```json
{
  "id": "uuid",
  "owner_user_id": "uuid",
  "title": "string",
  "jd_text": "string",
  "lifecycle_status": "active|archived",
  "created_at": "iso-8601",
  "updated_at": "iso-8601"
}
```

### 15.2 Candidate

```json
{
  "id": "uuid",
  "job_id": "uuid",
  "status": "uploaded|queued|parsing|parsed|ai_processing|completed|failed_parse|failed_ai|archived",
  "status_coarse": "pending|processing|completed|failed_parse|failed_ai|archived",
  "failure_code": "string|null",
  "failure_message": "string|null",
  "original_filename": "string",
  "created_at": "iso-8601",
  "updated_at": "iso-8601"
}
```

`status_coarse` is optional derived mapping (DDD Appendix A); **`status` is authoritative**.

### 15.3 Candidate Profile

```json
{
  "candidate_id": "uuid",
  "name": "string|null",
  "email": "string|null",
  "phone": "string|null",
  "skills": "array|null",
  "education": "array|null",
  "experience": "array|null",
  "certifications": "array|null",
  "projects": "array|null",
  "resume_summary": "string|null",
  "linkedin": "string|null",
  "github": "string|null",
  "portfolio": "string|null",
  "languages": "array|null",
  "location": "string|null",
  "updated_at": "iso-8601"
}
```

### 15.4 Evaluation

```json
{
  "id": "uuid",
  "candidate_id": "uuid",
  "job_id": "uuid",
  "match_score": "number|null",
  "rationale": "string|null",
  "summary": "string|null",
  "model_metadata": {
    "model": "string",
    "prompt_version": "string",
    "timings_ms": "number|null"
  },
  "evaluated_at": "iso-8601"
}
```

### 15.5 Analytics Summary

```json
{
  "active_jobs": 0,
  "total_candidates": 0,
  "completed_count": 0,
  "failed_count": 0,
  "avg_match_score": 0,
  "status_counts": { "queued": 0, "completed": 0, "failed_ai": 0 },
  "score_buckets": [{ "range": "81-100", "count": 0 }]
}
```

### 15.6 Error Response

See §10.1.

---

## 16. Traceability Matrix

| PRD Capability | SRS | SDD Module | DDD Entity/View | API |
| --- | --- | --- | --- | --- |
| Auth / session | SRS-FR-001–004 | Auth Module | `profiles` | §4 Auth APIs |
| Create/list jobs | SRS-FR-005–006 | Job Management | `jobs` | §5.1, §5.5–5.6 |
| Update job | SRS-FR-007 | Job Management | `jobs` | §5.2 |
| Archive/delete | SRS-FR-046–047 | Job Management | `jobs` | §5.3–5.4 |
| Upload resumes | SRS-FR-010–014, 017 | Resume Upload | `candidates`, `resume_files` | §6 |
| Screening async | ST-01, SRS-NFR-011 | Resume Processing | `processing_queue` | §8.2 |
| Retry AI | SRS-FR-025 | Resume Processing | `evaluations`, history | §8.3 |
| Rank candidates | SRS-FR-027–028 | Ranking | `evaluations`, ranking view | §7.5 |
| Candidate detail/CE | SRS-FR-029, 048–050 | Candidates | `candidate_profiles` | §7.2–7.3 |
| Failed visible | SRS-FR-030 | Ranking/Candidates | `candidates` | §7.1 |
| Filter/paginate | SRS-FR-031–032 | Candidates | `candidates` | §7.6 |
| Dashboard | SRS-FR-033 | Analytics | `dashboard_metrics` | §9.1 |
| Distributions | SRS-FR-034–036 | Analytics | stats/distribution views | §9.3–9.5 |
| Job progress | SRS-FR-038 | Analytics/Ranking | `job_progress_summary` | §5.7, §9.2 |
| No auto-hire | SRS-FR-026, BR-02 | — | — | **No endpoint** |
| Secrets server-only | SRS-FR-022, BR-05 | RPS | — | §8, §11 |

Every public endpoint in §§4–9 traces to at least one approved requirement above.

---

## 17. Future APIs

| Future capability | Notes |
| --- | --- |
| Webhooks | Notify external systems on `completed` / `failed_*` |
| Bulk export | CSV/JSON export (SRS-FR-041 Could) |
| Email notifications | Outbox + provider APIs |
| Interview scheduling | New resources beyond v1 |
| ATS integration | External system connectors |

Not in v1 scope; listed for roadmap only.

---

## 18. Conclusion

This API design operationalizes the approved stack and documents:

| Upstream | How APIs support it |
| --- | --- |
| Architecture | SPA → Supabase + async RPS; Gemini never in browser |
| PRD | Jobs, uploads, ranking, analytics, human-in-the-loop |
| SRS v1.1 | FR/ST/EH coverage without new features |
| SDD v1.1 | **202** async screening, polling, compensation |
| DDD v1.1 | Entities, statuses, views, defaults, path, PII rules |

It is the baseline for **UI/UX Design (RR-UIX-007)** and the **Cursor Developer Guide (RR-DEV-012)**.

---

## 19. API Architecture Review

| Issue | Severity | Recommendation | Affected Section |
| --- | --- | --- | --- |
| Dual surface (PostgREST + RPS) may confuse clients | **Minor** | Document clearly in Developer Guide; SPA modules call correct surface | §3 |
| Upload is multi-step composite, not single REST call | **Major** | Prefer documented orchestration or thin BFF in implementation; keep compensation rules | §6 |
| PostgREST filter syntax vs pure REST aesthetics | **Minor** | Accept for Supabase; wrap in repository layer in SPA | §5–7 |
| Optional `status_coarse` could drift from authoritative status | **Minor** | Derive only via mapping table; never accept as write input | §15.2 |
| Idempotency-Key storage mechanism unspecified | **Major** | Implement key store (table or cache) during development; design requires header | §8.2, API-05 |
| Rate-limit numeric thresholds not frozen | **Minor** | Set in deployment config; call out in RR-DEP-011 | §11, §13 |
| Delete job 409 vs 400 semantics | **Minor** | Prefer **409 Conflict** with archive guidance | §5.4 |
| Search Jobs is lightweight `ilike` only | **Observation** | Adequate for v1; not a search engine | §5.8 |
| Internal queue claim must never be exposed | **Major** | Enforce network/IAM isolation in deployment | §8.6, API-02 |
| Analytics views physical vs ad-hoc queries | **Minor** | Either satisfies contracts if shapes match §9 | §9 |
| No OpenAPI artifact yet | **Observation** | Intentionally deferred; contracts in §15 sufficient for UI design | Doc control |
| Missing explicit cancel-in-flight API | **Observation** | Correct — out of v1 (SDD) | §17 |
| Evaluation history read endpoint lightly specified | **Minor** | Sufficient for audit UI; expand in UI/UX if needed | §8.5 |

### Review Verdict

| Dimension | Assessment |
| --- | --- |
| REST compliance | Adequate for SaaS+Supabase hybrid; RPS uses resourceful `/v1/jobs/...` |
| Endpoint consistency | Naming aligned to jobs/candidates/evaluations/analytics |
| Security | JWT + ownership + no client Gemini; PII rules referenced |
| Versioning | v1 policy defined |
| Error handling | Standard object + EH codes frozen |
| Performance | Async 202, pagination, poll defaults |
| Traceability | Matrix complete for public surface |
| Missing endpoints | No Must gaps vs SRS; Could/Future deferred |

**Approved as baseline for RR-UIX-007** after treating composite upload orchestration and Idempotency-Key persistence as implementation prerequisites.

---

## 20. Appendices

### Appendix A — API Design Decisions

| ID | Decision | Reason | Alternative | Trade-off |
| --- | --- | --- | --- | --- |
| APD-01 | Async **202** only for screening | SDD v1.1 | Sync batch HTTP | UX non-blocking |
| APD-02 | Refined statuses in API (API-06) | DDD §4.4.1 authority | Coarse-only API | Clients see more states |
| APD-03 | Freeze 202 payload (API-01) | Close DDD open item | Defer to coding | Early contract stability |
| APD-04 | Idempotency-Key on screen/retry (API-05) | Safe retries | No keys | Need key store |
| APD-05 | Queue claim non-public (API-02) | Security | Public claim API | Ops isolation required |
| APD-06 | Error object with EH codes (API-04) | SRS §18 | Ad-hoc errors | Consistent UX |
| APD-07 | Analytics via named view routes | DDD §10.6 | Only ad-hoc aggregates | Clear UI contracts |
| APD-08 | Hybrid PostgREST + RPS | Fit Supabase stack | Custom monolith API | Two call styles |

### Appendix B — Closed Open Items (from DDD Appendix B)

| ID | Resolution |
| --- | --- |
| API-01 | §6.7 / §8.2 202 payload frozen |
| API-02 | Queue claim internal only §8.6 |
| API-03 | Poll candidates + progress/analytics views; interval §13.1 |
| API-04 | Error object §10.1 |
| API-05 | `Idempotency-Key` required on screen/retry |
| API-06 | Primary refined statuses; optional `status_coarse` |

### Appendix C — Document Control

| Item | Value |
| --- | --- |
| Path | `docs/02-design/06-API-Design-Specification.md` |
| Version | 1.0.0 |
| Upstream | RR-ARCH-001; RR-PRD-002; RR-SRS-003 v1.1.0; RR-SDD-004 v1.1.0; RR-DB-005 v1.1.0 |
| Next | RR-UIX-007 UI/UX Design Document |

---

**End of Document — Document 06 — RR-API-006 — API Design Specification v1.0.0**
