# Indie polish and MailerLite newsletter integration

## Decisions (13 October 2026)
- The owner's genuine Personal Effects and Anomaly Lab recordings are **on hold**. Their binary files and all playback controls have been removed from this PR branch, not simply hidden.
- Keep five real screenshot-based game cards; preserve all existing playable prototype links.
- Keep selective tactile card shadows, brighter small text, a retro serif headline accent and "Play the games" as the primary hero action.
- Remove overly repetitive technical labels without changing the core Pluto orbit artwork.

## MailerLite: ready for final connection
The new homepage "Postcards from Pluto" section currently displays a truthful **Email updates coming soon** message. It does **not** collect emails or claim MailerLite is connected.

To make it live:
1. In MailerLite, go to **Forms → Embedded forms → Overview** for the Pluto Night Labs form.
2. Copy the **Share URL** (HTTPS) and give it to the website owner/developer.
3. Set `site.newsletterUrl` in `src/config.ts` to that exact verified URL, on this preview branch.
4. Confirm MailerLite uses the correct `Pluto Night Labs – Newsletter` subscriber group and that double opt-in, sender email and business correspondence address are configured properly. These account settings are **not** configured by this repository.
5. Test a real subscribe → confirmation → unsubscribe cycle using a test email, then review the preview and privacy copy.

We deliberately prefer a hosted MailerLite signup link over loading MailerLite's universal JavaScript across every page. This keeps the existing no-on-site-tracking posture intact while still using the actual service. A different embed design requires the real embed snippet and an explicit privacy review.

## QA gates
- Cloudflare preview build must pass.
- Check homepage at 320px, 390px and desktop; verify no video elements/Watch buttons, no unconfigured "Join" link and correct privacy link.
- Once `newsletterUrl` is set, test that link points to the actual MailerLite hosted form. Never invent MailerLite form IDs or signup URLs.
- Live site remains unchanged until owner approval and PR merge.
