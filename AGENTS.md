# Pluto Night Labs site agent instructions

Preserve the repository's existing architecture, documented test commands,
release gates and unrelated working-tree changes. Do not deploy, publish,
change credentials, or perform remote operations without explicit authority.

## Shared testing policy

- For testing work, read and follow
  `/Users/tomrawnson/Developer/pluto-device-lab/PLUTO-TESTING-POLICY.md`.
- Repository documents and acceptance gates remain authoritative when stricter.
  Never report Simulator evidence as physical-device evidence.

## Pluto development workflow

- For future development tasks, read `/Users/tomrawnson/Developer/pluto-standards/standards/DEVELOPMENT-WORKFLOW.md`. This link does not relax this repository’s task authority, testing, privacy, content, device, human-review or release requirements. Report a broken reference.

## Shared production deployment protection

- Before any Pluto Night Labs website publish or rollback, read and follow
  `/Users/tomrawnson/Developer/pluto-standards/standards/CLOUDFLARE-DEPLOYMENTS.md`
  (particularly **PLUTO-CF-002**). Use current remote `main`, reconcile all
  other project changes and production-only pages, recheck freshness before
  publishing, and verify all preserved legal/privacy routes afterward.
- A successful local build or GitHub push alone does not authorise deployment.
  Never deploy a stale worktree or overwrite another product's live content.
