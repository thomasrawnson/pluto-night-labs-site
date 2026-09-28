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

The generated site is written to `dist/`. For Cloudflare Pages, use `npm run build` as the build command and `dist` as the output directory.

Social profile URLs are configured centrally in `src/config.ts`; empty values are not rendered.
