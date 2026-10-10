# Jamhoor daily morning update — runbook

Run every morning (UAE time, Asia/Dubai = UTC+4). Owner: Ahmad (founder). Goal: the site always shows today's
football correctly, and Ahmad wakes up to ready-to-post images + captions for X (@JamhoorUAE) and Instagram (@jamhoor.app).

## Facts
- Site: https://jamhoor.lovable.app — React/Vite app built in Lovable, synced from GitHub `ahmadsherkawi/fan-loyalty-hub` (branch main).
- Lovable project id `3f9f5ba6-4959-4951-87e7-e92e9b761976`. Publish with `mcp__Lovable__deploy_project` (`name: "jamhoor"`).
  After a `git push`, wait ~80 s, confirm `latest_commit_sha` via `mcp__Lovable__get_project`, then deploy.
- Supabase project `ohjhzmqcbprcybjlsusp` via `mcp__Supabase__execute_sql` / `apply_migration`.
- Fixtures/results sync automatically every 2 min (edge function `sync-gcc`, API-Football, competitions in table `af_leagues`).
  Codes: PL, PD (LaLiga), SA, BL1, FL1, CL, UPL (ADNOC Pro League), ULC (ADIB Cup), SPL (Saudi), ACL, QSL, KPL, BPL, OPL, SKC, TSL (Turkey), LPL (Lebanon), UNL, AGC, PPL, DED.
- Channels per competition: table `competition_broadcasters` (UPL/ULC free on Abu Dhabi, Dubai, Sharjah Sports; PL/PD beIN; SPL Thmanyah).
- Team names (EN/AR), short codes and colours: table `teams` (join fixtures.home_team_id / away_team_id).
- Daily image page for fans/Ahmad: https://jamhoor.lovable.app/today (Post 4:5 or Story 9:16, `?fmt=story`).
- Translations: `src/i18n/en.ts` + `ar.ts`; add keys with `python3 tools/i18n_add.py keys.json` (`{"key": ["en", "ar"]}`).
- Competition lists in code: `src/lib/competitions.ts`, `src/lib/predictor.ts` (PREDICTOR_COMPS, LEAGUE_COMPS, BIG_CLUBS),
  `src/pages/TodayPage.tsx` (ORDER), `src/pages/Landing.tsx` (BIG), `src/pages/VenueConfirmPage.tsx` (COMPS).

## Hard rules
- Never run SQL containing DELETE or DROP (the Supabase tool blocks it; keep migrations add-only). UPDATE/INSERT are fine.
- Never invent data: no fake users, names, reviews, scores or "X people are playing". Only real numbers from the database.
- Never post, DM or message anyone on Ahmad's behalf. You prepare; Ahmad posts.
- Only change code when something is actually wrong or stale. Typecheck (`npx tsc --noEmit -p tsconfig.app.json`) and
  build (`npm run build`) before every push. If unsure, don't change it — report it to Ahmad instead.
- Commit message ends with the attribution lines the session gives you.

## Steps
1. **Health check (read-only).**
   - Today's and the next 3 days' fixtures by competition (UAE time). Anything in progress or finished in the last 24h with
     `status` not FINISHED/AWARDED/POSTPONED/CANCELLED more than 3 hours after kick-off = sync problem → report.
   - `cron.job_run_details` failures in the last 24 h (jobs: jamhoor-sync-fixtures, sync-gcc, booking-housekeeping, jamhoor-retention).
   - `sync_state` row key 'gcc' updated within the last hour.
2. **Football news check** (WebSearch, standard mode; 3–5 searches in one go): today's big games and anything that changes them
   (postponements, kick-off changes, derbies, title races, cup draws, transfers/manager news big in the UAE/Gulf),
   UAE football (ADNOC Pro League, ADIB Cup, national team), Saudi Pro League, Champions League/AFC weeks, international breaks.
   Compare with the database: a postponed/moved game the feed hasn't caught yet → note it for Ahmad (don't edit fixtures by hand
   unless it is clearly wrong and confirmed by an official source; then UPDATE that one row and say so).
   New competition starting that UAE fans care about and isn't in `af_leagues` → recommend it to Ahmad (don't add without asking).
3. **Website check.** The landing page Predictor card and "Big games" use the biggest upcoming games automatically
   (`fixtureWeight` / `BIG_CLUBS` in `src/lib/predictor.ts`). If a club that is clearly big this season is missing from
   BIG_CLUBS, or a promo is stale (e.g. a finished tournament still advertised), fix it, build, push, sync, deploy.
   Seasonal promos to keep honest: `CupPromo` (Gulf Cup) only shows while AGC games are on.
4. **Numbers.** Visitors (Lovable `get_project_analytics`, last 1 and 7 days, top pages, sources, countries), new sign-ups
   (auth.users last 24 h, excluding `*@test.jamhoor.app`), predictions in last 24 h (exclude `is_test_user`), leagues and
   members, groups, venue claims pending, screenings added. Note: user c6dc4608-… is Ahmad himself — don't count him as traction.
5. **Today's posts.** Use `tools/social/make_posts.py` (read its header for the JSON spec). Make:
   - **A. Today's games** (the 3–5 biggest games today, UAE time, with channel) → `Jamhoor-today-post.png` + `-story.png`,
     QR `https://jamhoor.lovable.app/today?ref=ig`, CTA "Where’s it showing near you? / وين تنعرض قريب منك؟".
     Prefer UAE football when it's on; then PL, LaLiga, Saudi, Champions League; Turkish/Lebanese when notable.
   - **B. One extra** depending on the day: yesterday's big **results** (use `"score"` instead of time, pill "RESULTS · النتائج",
     CTA to the Predictor table) or, before a big weekend/derby/Champions League night, a **Predictor** call-to-action
     (QR `https://jamhoor.lovable.app/predictor?ref=ig`). If there are no notable games today, make only B.
   - Check every image yourself (open it with Read): nothing cut, Arabic reads right-to-left correctly, QR check says ok.
   - Write captions: X (short, EN + AR, 2–4 hashtags, one question to drive replies) and Instagram (EN + AR, hashtags,
     "link in bio"). Suggest posting times (morning ~11:00, evening ~20:00 UAE).
6. **Report to Ahmad** with SendUserMessage (short, scannable): what you checked/changed on the site (or "no changes needed"),
   football news that matters, numbers vs yesterday, today's two posts with captions, and 1–2 concrete growth actions for
   today (e.g. which Instagram DM batch day, who to tag). Send the images with SendUserFile (status "proactive").
   If a tool (Supabase/Lovable/GitHub) is unavailable, say exactly that rather than guessing.
