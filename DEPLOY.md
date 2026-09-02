# Deploy to Cloudflare Pages

**Repo:** [github.com/JaimeV365/onemoreswap](https://github.com/JaimeV365/onemoreswap)  
**Live URL (after setup):** `https://onemoreswap.pages.dev`

GitHub is ready. Connect Cloudflare once (~5 minutes) and every push to `main` auto-deploys.

---

## Connect GitHub → Cloudflare Pages

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) (free account is fine).

2. Open **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.

3. Authorize GitHub and select repo: **`JaimeV365/onemoreswap`**.

4. Use these build settings:

   | Setting | Value |
   |---------|--------|
   | Project name | `onemoreswap` |
   | Production branch | `main` |
   | Framework preset | **None** (or Vite) |
   | Root directory | `web` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Node.js version | `20` |

5. Click **Save and Deploy**. First build takes ~1–2 minutes.

6. Your site is live at **`https://onemoreswap.pages.dev`**.

---

## Alternative: deploy from your machine

If you prefer the CLI instead of Git integration:

```powershell
cd web
npm run build
npx wrangler login
npx wrangler pages deploy dist --project-name=onemoreswap
```

(`wrangler login` opens a browser — approve access when prompted.)

---

## Custom domain later

When you register **onemoreswap.com**, add it in Cloudflare Pages → **Custom domains** on the `onemoreswap` project.
