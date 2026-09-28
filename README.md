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

Astro generates `/`, `/contact`, and `/privacy` as static routes. Wrangler's default HTML handling serves the generated directory index files at those URLs.

Social profile URLs are configured centrally in `src/config.ts`; empty values are not rendered.
