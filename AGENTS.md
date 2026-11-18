# Pluto Night Labs site agent instructions

Preserve the repository's existing architecture, documented test commands,
release gates and unrelated working-tree changes. Do not deploy, publish,
change credentials, or perform remote operations without explicit authority.

## Shared testing policy

- For testing work, read and follow
  `/Users/tomrawnson/Developer/pluto-night-labs/studio/pluto-device-lab/PLUTO-TESTING-POLICY.md`.
- Repository documents and acceptance gates remain authoritative when stricter.
  Never report Simulator evidence as physical-device evidence.

## Pluto development workflow

- For future development tasks, read `/Users/tomrawnson/Developer/pluto-night-labs/studio/pluto-standards/standards/DEVELOPMENT-WORKFLOW.md`. This link does not relax this repository’s task authority, testing, privacy, content, device, human-review or release requirements. Report a broken reference.

## Shared production deployment protection

- **Pushing to `main` deploys production.** Cloudflare Workers Builds is
  connected to this repository and deploys every push to `main` within about a
  minute; other branches get preview builds only. Follow **PLUTO-CF-003** and
  **PLUTO-CF-002** in
  `/Users/tomrawnson/Developer/pluto-night-labs/studio/pluto-standards/standards/CLOUDFLARE-DEPLOYMENTS.md`.
- Push or merge to `main` only when the change is approved to go live. Keep
  unreleased work on a branch and never label a commit on `main` "not deployed".
- Do not run `wrangler deploy` for this site. Roll back by reverting on `main`.
- Before pushing: start from current remote `main`, merge rather than replace,
  run `npm run build` and QA, and never force-push. After pushing: confirm the
  "Workers Builds: pluto-night-labs-site" check succeeded for the SHA and verify
  the changed routes plus all preserved legal/privacy pages live.
