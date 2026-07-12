# Phase 12 resume fixture catalog (CP-30 / RR-TEST-010 Appendix B)

This folder is a **path catalog** for QA/manual testing. Keep files synthetic and non-PII.

## Required fixture groups

| Group | Minimum | Primary test IDs |
| --- | --- | --- |
| Valid PDFs (single + batch) | 10 | `TC-UPL-001`, `TC-UPL-007`, `TC-AC-001` |
| Large batch PDFs | 20 | `TC-UPL-008`, `TC-NFR-001` |
| Unsupported files | 1 `.txt` + 1 `.png` | `TC-UPL-003`, `TC-UPL-004` |
| Corrupt PDF | 1 | `TC-PRS-002`, `TC-PRS-003` |
| Injection resume | 1 | `TC-AI-011`, `TC-SEC-004` |
| DOCX valid | 1+ | `TC-UPL-002`, `TC-AC-001` |

## Notes

- The repo tracks fixture **paths** (`paths.txt`) so teams can drop local files without committing binaries.
- If you need deterministic local generation, create synthetic PDFs/DOCX with fake names/skills only.
- Never commit real resumes or production-identifiable data.
