# ACT-WEB-01 brief

Owner-approved 2026-11-16. Project record: `~/Developer/pluto-night-labs/studio/pluto-second-brain/projects/actby.md` (experiment slot).

```
TASK: ACT-WEB-01 — Actby waitlist landing page at plutonightlabs.com/actby/ that tests UK interest and price preference
REPO: ~/Developer/pluto-night-labs/studio/pluto-night-labs-site   WORKTREE: ~/Developer/_worktrees/pluto-night-labs-site/ACT-WEB-01/ (from current main)
RISK: MEDIUM — new public page and copy; no stored data, no new services
MODEL TIER: standard
TRACK: Fast Track (local build, commit and push task branch). Deployment is Controlled and excluded: separate approval per standards/CLOUDFLARE-DEPLOYMENTS.md (PLUTO-CF-002).
SCOPE:
- New page src/pages/actby/index.astro using BaseLayout, built from docs/ACT-WEB-01-REFERENCE.html (design reference only; adapt to site components). Copy the reference file into the worktree from the main checkout if it is not committed.
- Sections: hero ("Never auto-renew by accident again."), the problem, how it works (snap letter → act-by date → you both get a nudge), made for two (shared list, who's on it), UK presets, calm by design (no bank login, no ads, no advice), pricing question, FAQ, footer CTA.
- Waitlist = the existing mailto pattern from src/pages/playtests/join.astro: email, required consent checkbox, plus one required question "Which would you pick?" with options Free (up to 8 items) / £2.99 a month / £24.99 a year / £14.99 once / Wouldn't pay. Mail goes to hello@plutonightlabs.com, subject "Actby waitlist", body includes the choice and consent text.
- Paper & Moss palette (light) with Instrument Serif headings + Inter, as in the reference. Fictional provider names only, no real brands or logos.
- One "Coming soon · Join the waitlist" card for Actby on src/pages/products.astro.
- Short privacy note on the page and a link to /privacy/ (no data stored by the site).
EXCLUDE: other pages and nav, existing uncommitted files in the main checkout, analytics or any new service/SDK/form backend, savings statistics or unsourced claims, deployment, app code.
DONE WHEN:
1. `npm run build` passes (astro check + build).
2. Playwright screenshots of /actby/ at 320x680, 390x844, 430x932 and 1440x900 saved to docs/screenshots/act-web-01/; no horizontal scroll, text readable, tap targets ≥44px.
3. Playwright test: submit is blocked without email, consent or price choice; with all three, the generated mailto has the right address, subject, choice and consent text.
4. Automated accessibility check (axe or the repo's existing tooling) on /actby/ shows no serious or critical issues.
5. tidy-check.py clean; projects/actby.md in the second brain updated under Latest.
STOP IF: scope grows, the mailto pattern can't be reused, a source conflicts, a check can't pass.
TOOLS: Playwright.
```

Read first: `pluto-standards/CORE.md`, this repo's `AGENTS.md`, `pluto-second-brain/projects/actby.md`. Finish with the CORE.md report format (200 words max).
