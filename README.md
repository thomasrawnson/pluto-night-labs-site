# Pluto Night Labs website

Production website for [Pluto Night Labs Ltd](https://plutonightlabs.com), built with Astro and deployed as static files.

## Local development

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
```

The generated site is written to `dist/`.

## Cloudflare Workers deployment

Wrangler is configured in `wrangler.jsonc` to deploy `dist/` as static assets for the `pluto-night-labs-site` Worker. The site remains a static Astro build with no Workers runtime code. Unmatched paths return a 404 rather than falling back to the home page.

Build and deploy with:

```sh
npm run build
npx wrangler deploy
```

To validate the configuration without deploying:

```sh
npx wrangler deploy --dry-run
```

Astro generates `/`, `/products`, `/lab`, `/contact`, and `/privacy` as static routes. Wrangler's default HTML handling serves the generated directory index files at those URLs.

Social profile URLs are configured centrally in `src/config.ts`; empty values are not rendered.

Product cards are maintained in `src/pages/products.astro`; experimental games and links are listed in `src/pages/lab.astro`. The homepage features selected games. New SVG covers under `public/lab/` are concept illustrations, not gameplay captures. Never label unavailable prototypes as playable.

## Public product detail pages

The product catalogue links to static `/products/shelfpick/` and `/products/usagegrid/` detail pages. They describe in-progress products and offer a manual email enquiry rather than an automated waitlist or purchase.

- ShelfPick shows a development screenshot from the **public** ShelfPick repository. Review it before launch and replace it when the interface changes.
- UsageGrid uses a labelled visual concept. Do not publish private repository screenshots without explicit approval.
- DevPip remains an enquiry-only product.

The Lab prioritises Night Parcel Office, Personal Effects and Anomaly Lab. Seven entries have playable prototype links, while Gladiator Mayhem is explicitly in development. The feedback control opens a prefilled email draft. No submission service is configured.

The homepage uses two centred orbital ellipses with foreground arcs to create a complete path around Pluto. Run `npm run build` and `npm run qa:prelaunch` against a local dev server before merging; Cloudflare preview builds run the Astro build but do not automatically execute browser QA.
