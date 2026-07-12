# Scripts

Utility scripts for verification and deployment support.

## Phase 12 / security

- `verify-bundle-secrets.sh`  
  Builds `apps/web` and scans `dist/` for forbidden Gemini/service-role markers.

## Phase 13 manual deployment

- `phase13-preflight.sh`  
  Runs Node version guard + `apps/web` lint/build/tests before deployment.

- `phase13-deploy-supabase.sh`  
  Manual Supabase deploy helper (link project, `db push`, set secrets, deploy Edge functions).

### Example usage

```bash
# 1) preflight
bash scripts/phase13-preflight.sh

# 2) deploy to one Supabase environment
export SUPABASE_PROJECT_REF=<project_ref>
export SUPABASE_URL=<project_url>
export SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
export GEMINI_API_KEY=<gemini_key>
export GEMINI_MODEL=gemini-2.0-flash

bash scripts/phase13-deploy-supabase.sh
```
