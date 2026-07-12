# ResumeRank AI

AI-powered Resume Screening and Candidate Ranking System.

MBA Final Year Project specializing in Artificial Intelligence & Data Science.

## Overview

ResumeRank AI enables HR personnel to:

- Create job openings
- Upload multiple resumes
- Extract candidate information
- Compare resumes with job descriptions
- Generate AI match scores and summaries
- Rank candidates
- View analytics on a dashboard

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| AI | Google Gemini API |
| Parsing | pdf-parse, mammoth |
| Deployment | Vercel |

## Documentation

Professional documentation is maintained under [`docs/`](./docs/README.md).

**Governing plan:** [Documentation Roadmap (RR-DOC-000)](./docs/00-Documentation-Roadmap.md)

**Completed:**
- [Project Architecture (RR-ARCH-001)](./docs/01-requirements/01-Project-Architecture.md)
- [Product Requirements Document (RR-PRD-002)](./docs/01-requirements/02-Product-Requirements-Document.md)
- [Software Requirements Specification (RR-SRS-003 v1.1.0)](./docs/01-requirements/03-Software-Requirements-Specification.md)
- [System Design Document (RR-SDD-004 v1.1.0)](./docs/02-design/04-System-Design-Document.md)
- [Database Design Document (RR-DB-005 v1.1.0)](./docs/02-design/05-Database-Design-Document.md)
- [API Design Specification (RR-API-006 v1.1.0)](./docs/02-design/06-API-Design-Specification.md)
- [UI/UX Design Document (RR-UIX-007 v1.1.0)](./docs/02-design/07-UI-UX-Design-Document.md)
- [AI Design & Prompt Engineering Document (RR-AI-008 v1.0.0)](./docs/03-specialty/08-AI-Design-Document.md)
- [Security Design Document (RR-SEC-009 v1.0.0)](./docs/03-specialty/09-Security-Design.md)
- [Testing & Quality Assurance Document (RR-TEST-010 v1.0.0)](./docs/03-specialty/10-Testing-Document.md)
- [Deployment Guide (RR-DEP-011 v1.0.0)](./docs/04-delivery/11-Deployment-Guide.md)
- [Cursor Developer Guide (RR-DEV-012 v1.0.0)](./docs/04-delivery/12-Cursor-Developer-Guide.md)
- [Final MBA Project Report (RR-MBA-013 v1.0.0)](./docs/05-mba-report/13-Final-MBA-Report.md)

Documents are authored one at a time. Do not skip ahead in the roadmap.

## Status

Documentation suite complete (RR-DOC-000 through RR-MBA-013).

**Implementation:**
- Phase 1 — SPA scaffold under [`apps/web`](./apps/web)
- Phase 2 — Supabase project layout under [`supabase/`](./supabase) + browser client (`lib/supabase.ts`)

Follow [Cursor Developer Guide (RR-DEV-012)](./docs/04-delivery/12-Cursor-Developer-Guide.md). After creating a Supabase project, copy [`.env.example`](./.env.example) values into `apps/web/.env` (public `VITE_*` only) and run `npx supabase link --project-ref <ref>`.
