# Screenshot-led Lab and homepage cards

This branch introduces five **real gameplay** stills for Night Parcel Office, Personal Effects, Anomaly Lab, Going, Going, Ghoul!, and Tiny Heist Planner.

## Required binary assets before merging

The optimised, artwork-preserving WebP files are supplied separately as `pluto-website-gameplay-assets.zip` (generated from the project owner's uploaded screenshots).

Install these files into this repo preserving the paths:

- `public/images/games/night-parcel-office/featured.webp`
- `public/images/games/personal-effects/featured.webp`
- `public/images/games/anomaly-lab/featured.webp`
- `public/images/games/going-going-ghoul/featured.webp`
- `public/images/games/tiny-heist-planner/featured.webp`

The page code contains a **temporary preview fallback** to the original art until all five files are uploaded. **Do not merge until the five WebPs exist on the pull request branch and screenshot QA passes.**

## Image integrity

- Assets are real captures, cropped, resized and compressed to 800 × 500 WebP.
- No game elements, results or visual effects were invented or retouched.
- The original screenshots and source recordings stay in the owner's `pluto-content` media folders.
- Concept art remains labelled on the projects that still use it.
- The three uploaded phone recordings remain out of the live website for now; phone/browser controls and vertical framing make them poor autoplay media.

## Visual checks

At 320px, 390px and desktop widths, check the screenshot crop, tactile frame, title readability, status badge contrast, Play links and card overlap.

Run `npm run build` and `npm run qa:prelaunch` against an active local preview. The QA script explicitly checks all five screenshot URLs, so it must fail until the binary assets have been installed.
