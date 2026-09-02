# One More Swap

Sticker swap platform — find spares, finish your album.

- **Live site:** Cloudflare Pages (see repo deployments)
- **Product domain (future):** [onemoreswap.com](https://onemoreswap.com)
- **App:** [`web/`](web/) — React + Vite, deployed to Cloudflare Pages

## Develop locally

```bash
cd web
npm install
npm run dev
```

## Build

```bash
cd web
npm run build
```

Output: `web/dist/`

## Cloudflare Pages

| Setting | Value |
|---------|--------|
| Root directory | `web` |
| Build command | `npm run build` |
| Build output | `dist` |
| Node version | 20 |

Internal product docs (`sticker-platform-spec.md`, `onemoreswap-palette.html`, etc.) stay in this folder for planning — not required for the public build.
