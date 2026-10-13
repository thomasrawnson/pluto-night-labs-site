# WEB-11 — Homepage simplification (preview only)

## Goals
Reduce competing calls to action and improve scanability without changing the site's established colour system or real gameplay art.

## Changes
- Keep the hero and three featured projects (ShelfPick, UsageGrid and Night Parcel Office).
- Replace the small thumbnail + arrow rows with three larger, entirely clickable physical-style game cards for Personal Effects, Anomaly Lab and Going, Going, Ghoul!
- Remove the "Also in the Lab" secondary links; retain one **Explore all experiments** link to the full Lab.
- Create a single playtester invitation strip linking to the existing `/playtests/join/` form.
- Hide the inactive "Postcards from Pluto" marketing section. **MailerLite configuration remains in `src/config.ts`** and can be activated as a separate later task once the provider is ready and the actual signup URL is verified.
- Remove redundant "Small studio. Big curiosity." strip; slim footer copy and anchor `#about` to footer to keep navigation working.
- Retain existing prototype images, routes, header and other pages. No video embeds and no analytics added.

## Release checks
- Cloudflare preview build must succeed.
- Run `npm run build` and `npm run qa:prelaunch` with dev server running on a Mac.
- Review at 320px, 390px and desktop to ensure all card images and copy are legible.
- Check `/#about`, homepage Play/Explore, all three game cards, Explore all experiments, Become a playtester, footer privacy and contact links.
- Don't merge until approved.
