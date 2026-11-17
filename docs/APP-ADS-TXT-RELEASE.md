# app-ads.txt for Ripple Links: production release packet (PLUTO-CF-002)

**Prepared:** 17 Nov 2026. **Status:** ready, **not pushed, not deployed.** Needs the owner's exact approval phrase below.

## Why
Ripple Links (submitted to App Review on 17 Nov 2026) shows AdMob interstitials: non-personalised ads, no ATT. Its App Store marketing URL is `https://plutonightlabs.com/ripple-links/`. AdMob looks for `app-ads.txt` at the root of the developer website's domain, so the file must be served at `https://plutonightlabs.com/app-ads.txt`. Without it, AdMob may limit ad serving. Before this change, the live URL returned 404.

## What changes
- **New** `public/app-ads.txt`, copied unchanged to `dist/app-ads.txt`. It is one line, 59 bytes: ASCII, no BOM, LF ending, SHA-256 `634906c9d36e82e22607b09281a35e43e0a8aa68f1f34720d6eb981d56ad53ee`:

  ```
  google.com, pub-7403695126805412, DIRECT, f08c47fec0942fa0
  ```

  The fields, in order, are: ad system domain, the publisher ID of the AdMob app ID `ca-app-pub-7403695126805412` (without the `ca-app-` prefix), the DIRECT relationship, and Google's certification authority (TAG) ID. This matches the AdMob help page "Set up an app-ads.txt file for your app" (support.google.com/admob/answer/9363762) and the IAB Tech Lab specification it cites.
- This packet, `docs/APP-ADS-TXT-RELEASE.md`.
- No other route, page, asset, navigation, redirect or configuration change.

## Preflight evidence (17 Nov 2026, about 07:27 UTC)
| Check | Result |
|---|---|
| Site repo / target | `pluto-night-labs-site`; Worker `pluto-night-labs-site` (static assets from `dist/`, `wrangler.jsonc`, `not_found_handling: 404-page`) |
| Remote `main` after `git fetch` | `b457a62` (Actby concept screens) |
| Release branch | `feat/app-ads-txt` = `b457a62` + one commit: a **fast-forward** of `origin/main`. Isolated worktree `_worktrees/pluto-night-labs-site/app-ads-txt` |
| Live Cloudflare version | `ad71580e-c92c-447e-a7b6-5d0f10ac5c2a` (created 2026-11-16 14:36 UTC, 100%), from `npx wrangler deployments list` (read only) |
| Production versus `main` | Every built route was fetched live and byte-compared with this build. **All 30 are identical:** `/`, `/about/`, `/actby/`, `/contact/`, `/games/`, `/lab/`, `/last-train-home/` and `/privacy/`, `/microgames/`, `/orbit-slingshot/privacy/`, `/playtests/` and its 4 subpages, `/privacy/`, `/products/`, `/ripple-links/privacy/` and `/support/`, `/shelfpick/` with `/privacy/`, `/support/` and `/terms/`, `/software/`, `/team/`, `/usagegrid/`, plus `robots.txt`, `favicon.svg`, `sitemap-index.xml` and `sitemap-0.xml`. Only `/app-ads.txt` differs (404 live). No production-only content was found. The Actby and Orbit Slingshot pages on `main` are already live |
| Route conflicts | No page under `src/pages` matches `app-ads`. `_redirects` only has the two `/products/*` 301s. `app-ads.txt` is not in the sitemap (Astro lists pages only) |
| `npm ci` then `npm run build` (astro check + build) | 0 errors, 0 warnings, 0 hints; 23 pages. `cmp public/app-ads.txt dist/app-ads.txt`: identical. First bytes are `676f6f` ("goo"), so there is no BOM |
| Served locally with `npx wrangler dev --local` | `GET /app-ads.txt` gives `200`, `Content-Type: text/plain; charset=utf-8`, and the body is byte-identical to `dist/`. `/products/shelfpick/` still redirects 301 to `/shelfpick/` |
| `npm run qa:prelaunch` (output to scratch) | 15 route checks with no overflow or console errors. The same **6 known stale failures** as on 15 Nov (`/products/shelfpick/` and `/products/usagegrid/` detail pages that `main` no longer has). They are not caused by this change |

## Approval bundle (one phrase covers steps 1–6, in order)
Owner replies exactly: **`Deploy app-ads.txt: push feat/app-ads-txt to main and wrangler deploy`**. When asking, the agent states the branch head SHA. Step 1 refuses if that head has changed since.

1. `git fetch origin`. **Stop** if `origin/main` is no longer `b457a62`: rebase, rebuild, rerun the checks and ask again.
2. Push the release branch to `origin/main` as a fast-forward (`git push origin feat/app-ads-txt:main`, no force).
3. Make a fresh, clean worktree at the new `origin/main`. Run `npm ci` and `npm run build`; both must pass again.
4. Race check immediately before deploy:
   - `git ls-remote origin refs/heads/main` equals the build commit;
   - `npx wrangler deployments list` (read only) still shows live version `ad71580e-c92c-447e-a7b6-5d0f10ac5c2a`;
   - live `/`, `/ripple-links/privacy/` and `/shelfpick/privacy/` are still byte-identical to the build.

   **Stop** if anything has moved.
5. `npx wrangler deploy` from that worktree. Expect exactly one changed asset: `/app-ads.txt`.
6. Post-deploy proof:
   - Git SHA, Cloudflare version ID and deploy time;
   - `https://plutonightlabs.com/app-ads.txt` gives HTTP 200 and `text/plain`, with bytes identical to the build (SHA-256 above). Also check that `http://` reaches the same file;
   - every other route is byte-identical to the build, including the preserved legal pages `/privacy/`, `/ripple-links/privacy/`, `/ripple-links/support/`, `/last-train-home/privacy/`, `/orbit-slingshot/privacy/`, `/shelfpick/privacy/`, `/shelfpick/terms/` and `/shelfpick/support/`.

   Record everything in this file.

**After deploy (owner, in AdMob):** Apps → Ripple Links → app-ads.txt → "Check for updates". Verification can take up to 24 hours. AdMob reads the developer website from the App Store listing, whose hostname is `plutonightlabs.com`.

**Cost:** none. **Exclusions:** no other site changes, no DNS, no Cloudflare project changes, no deletion of old deployments.
**Rollback:** only with separate rollback approval, to the previous version `ad71580e-c92c-447e-a7b6-5d0f10ac5c2a` recorded in step 4 (CF-002 §7). Rolling back takes `/app-ads.txt` offline again.
