# Jamhoor (جمهور)

Your football crowd, wherever you live. Supporter groups, watch parties, check-ins, a free prediction league, a Fan Passport and AI match-day features — in English and Arabic.

- Frontend: Vite + React + Tailwind + shadcn/ui (this repo, synced with Lovable)
- Backend: Supabase project `ohjhzmqcbprcybjlsusp` (schema, RLS, SQL functions and edge functions `jamhoor-ai` and `sync-fixtures` are managed directly in Supabase, not from this repo)
- Fixtures and live scores: football-data.org, synced every 2 minutes by `sync-fixtures` (pg_cron)
