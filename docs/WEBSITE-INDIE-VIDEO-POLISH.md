# Indie homepage polish and real gameplay clips

## Scope

- The homepage keeps the current Pluto interactive artwork, three featured projects and three small Lab previews.
- Replace the redundant "SYSTEMS: NOMINAL" telemetry strip with breathing room; keep one atmospheric orbital readout.
- Relax headline tracking and use a warm retro serif for only "Strange games."
- Add restrained physical offset shadows to featured cards and make small labels easier to read.
- Make **Play the games** the main hero action.

## Footage

Two short **actual game recordings** have been reviewed and prepared from the owner's October 13 phone uploads. The original recordings are not modified, and no new scenes are fabricated.

```
public/videos/games/personal-effects/preview.mp4  # approx 7.5 seconds, ~264KB, silent
public/videos/games/anomaly-lab/preview.mp4        # approx 6.8 seconds, ~71KB, silent
```

These MP4s are distributed separately in `pluto-gameplay-clips.zip` and are **not included in this draft branch until the owner commits them**. The Lab page checks for their existence during the Astro build and displays the Watch control only when a clip is present. Do not merge until both files are added and the final preview is reviewed.

Night Parcel Office remains a static gameplay screenshot because the supplied videos were Personal Effects and Anomaly Lab; the two Anomaly Lab video uploads were exact duplicates. A Night Parcel Office clip should not be claimed until the owner supplies a recording of that game.

## Experience rules

- No autoplay or automatic movement, including on hover.
- Native video controls and `playsinline` on mobile, with `preload="none"`.
- The existing WebP gameplay screenshot remains the static poster and fallback.
- Real game footage is identified as such. Do not use generated artwork to impersonate real footage.
- Preserve 320px and 390px readability, focus indicators, all gameplay links and reduced-motion preferences.

## Release checks

1. Copy both MP4 files into the paths above and commit them to the same preview branch.
2. Run `npm run build`.
3. Start the site locally, then run `REQUIRE_GAME_CLIPS=1 npm run qa:prelaunch`.
4. Review the Cloudflare preview at desktop and mobile widths, especially Safari's native playback controls.
5. Merge only after owner visual approval.
