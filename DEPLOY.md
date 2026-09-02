# Deploy to Cloudflare Pages

**Repo:** [github.com/JaimeV365/onemoreswap](https://github.com/JaimeV365/onemoreswap)  
**Live URL:** `https://onemoreswap.pages.dev`

---

## Pages build settings

| Setting | Value |
|---------|--------|
| Project name | `onemoreswap` |
| Production branch | `main` |
| Root directory | `web` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `20` |

Functions live in `web/functions` (API under `/api/auth/*`).

---

## Accounts (email + password + Turnstile)

### 1. Create D1 database

```powershell
cd web
npx wrangler d1 create onemoreswap
```

Paste the `database_id` into `web/wrangler.toml`. In the Pages dashboard: **Settings → Bindings → D1** → binding name `DB` → select that database.

### 2. Apply schema

```powershell
cd web
npx wrangler d1 execute onemoreswap --remote --file=./schema.sql
```

### 3. Cloudflare Turnstile (bot check)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile** → Add widget for `onemoreswap.pages.dev` (and later `onemoreswap.com`).
2. Pages → **Settings → Environment variables**:
   - `TURNSTILE_SITE_KEY` = site key (also set under **Vars** / wrangler `[vars]`)
   - Secret `TURNSTILE_SECRET_KEY` = secret key  
     (`npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name=onemoreswap`)

**Test keys** (always pass): site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

### 4. Password rules (enforced client + server)

- 12–128 characters  
- At least one lowercase, uppercase, number, and symbol  
- Printable ASCII only — **no spaces, no emoji/Unicode lookalikes**  
- Stored as PBKDF2-SHA-256 hash (not plain text)  
- Forms use `autocomplete` so browsers can **save** passwords  

---

## Custom domain

When you register **onemoreswap.com**, add it under Pages → Custom domains.
