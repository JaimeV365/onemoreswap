# One More Swap

Sticker swap platform — find spares, finish your album.

- **GitHub:** [github.com/JaimeV365/onemoreswap](https://github.com/JaimeV365/onemoreswap)
- **Live site:** [onemoreswap.pages.dev](https://onemoreswap.pages.dev) (after Cloudflare Pages setup — see [DEPLOY.md](DEPLOY.md))
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
