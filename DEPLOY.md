# Deploy & enable login (Cloudflare)

Live site: https://onemoreswap.pages.dev  
Do these steps **in order**. After Step 2 the site can deploy again; after Step 5 login works.

---

## Step 0 — Fix the failed deploy (already in git)

The last deploy failed because `wrangler.toml` had a fake database ID. That placeholder is removed so the next push can publish Functions again. **You still must create a real D1 database** (Step 1–2) or Account will say “sign-in is being set up”.

---

## Step 1 — Create the D1 database

1. Open [dash.cloudflare.com](https://dash.cloudflare.com)
2. Left menu: **Storage & databases** → **D1 SQL database** (or search “D1”)
3. **Create database**
4. Name: `onemoreswap`
5. Create it
6. Open the database → copy the **Database ID** (a UUID like `a1b2c3d4-...`)  
   Keep it somewhere — optional for later CLI use

---

## Step 2 — Bind D1 to the Pages project

1. **Workers & Pages** → project **`onemoreswap`**
2. **Settings** → **Bindings** (sometimes under “Functions”)
3. **Add** → **D1 database**
4. Variable / binding name: **`DB`** (exactly this — capital D, capital B)
5. Database: select **`onemoreswap`**
6. Save

Redeploy so the binding applies:

- **Deployments** → latest → **Retry deployment**,  
  **or** push any commit to `main`

Until this binding exists, `/api/auth/*` returns “not configured”.

---

## Step 3 — Create the users tables (schema)

### Easiest: D1 Console in the browser

1. Dashboard → **Storage & databases** → **D1** → **`onemoreswap`**
2. Open **Console** (or **Explore data** → query)
3. Paste the contents of `web/schema-console.sql` (or `web/schema.sql`) and **Run**
4. Confirm with:

```sql
SELECT name FROM sqlite_master WHERE type='table';
```

You want `users`, `sessions`, and `profiles`.

### Cloud sync table (v3)

If you already have users/profiles, paste this in D1 Console:

```sql
CREATE TABLE IF NOT EXISTS profile_sync (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_json TEXT NOT NULL DEFAULT '{}',
  postal_json TEXT NOT NULL DEFAULT '{}',
  sources_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  revision INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_profile_sync_user ON profile_sync (user_id);
```

Or CLI: `npx wrangler d1 execute onemoreswap --remote --file=./schema-migrate-v3-sync.sql`

Confirm `profile_sync` appears in `sqlite_master`.

### Email verification table (v4)

```sql
CREATE TABLE IF NOT EXISTS email_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires ON email_tokens (expires_at);
```

### Resend (real inbox emails)

1. Create a [Resend](https://resend.com) account and API key  
2. Pages → **onemoreswap** → Variables / Secrets:  
   - Secret `RESEND_API_KEY`  
   - Plaintext `EMAIL_FROM` = `One More Swap <you@your-verified-domain>`  
3. Redeploy  

Until Resend is set, Account → **Send confirmation email** returns a **test link** you can open manually.

### Or via CLI (full schema)

```powershell
cd "C:\Users\jaime\OneDrive\Documents\JAND Games\Panini World Cup 2026\One More Swap\web"
npx wrangler login
npx wrangler d1 execute onemoreswap --remote --file=./schema.sql
```

If an older schema already created bare `users`/`sessions` columns, also run:

```powershell
npx wrangler d1 execute onemoreswap --remote --file=./schema-migrate-v2.sql
npx wrangler d1 execute onemoreswap --remote --file=./schema-migrate-v3-sync.sql
```

If signup says tables are missing, this step was skipped.
---

## Step 4 — Cloudflare Turnstile (bot tick)

1. Dashboard → **Turnstile** → **Add site**
2. Site name: `One More Swap`
3. Domains: add  
   - `onemoreswap.pages.dev`  
   - later also `onemoreswap.com`
4. Widget mode: **Managed** (default) is fine
5. Create → copy **Site Key** and **Secret Key**

### Put keys on the Pages project

1. **Workers & Pages** → **onemoreswap** → **Settings** → **Environment variables**
2. **Production** (and Preview if you use it):

| Type | Name | Value |
|------|------|--------|
| Plain text | `TURNSTILE_SITE_KEY` | *(site key from Turnstile)* |
| Secret | `TURNSTILE_SECRET_KEY` | *(secret key from Turnstile)* |

3. Save → **Retry deployment** (env vars apply on next deploy)

**Quick test keys** (always pass — OK for first smoke test only):

| Name | Value |
|------|--------|
| `TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` |
| `TURNSTILE_SECRET_KEY` | `1x0000000000000000000000000000000AA` |

Switch to your real Turnstile keys before inviting other people.

---

## Step 5 — Confirm login works

1. Wait for a **green** successful deployment  
2. Open https://onemoreswap.pages.dev/account  
3. You should see **Sign in** / **Create account** (not “being set up”)  
4. Create an account with a strong password (checklist on the form)  
5. Complete the Turnstile tick → **Create account**  
6. You should land in Settings as signed in  

Optional check: open https://onemoreswap.pages.dev/api/auth/config  
Expect something like:

```json
{"turnstileSiteKey":"...","authConfigured":true,"turnstileRequired":true}
```

`authConfigured: false` → D1 binding missing (Step 2) or old deploy.  
Empty `turnstileSiteKey` → Step 4 env var missing / not redeployed.

---

## Checklist

- [ ] D1 database `onemoreswap` created  
- [ ] Pages binding **`DB`** → that database  
- [ ] `schema.sql` executed remotely  
- [ ] `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` set  
- [ ] Successful redeploy after bindings/vars  
- [ ] Can create account on `/account`

---

## If something fails

| Symptom | Fix |
|---------|-----|
| Deploy error `Invalid database UUID` | Don’t put a fake ID in `wrangler.toml`; bind D1 in the dashboard only (this is the intended setup) |
| “Sign-in is being set up” | Binding name must be `DB`; redeploy after adding it |
| “Bot check failed” | Secret key wrong, or site key empty — fix Step 4 and redeploy |
| “Account service is not configured” | Same as D1 binding / schema |
| Email already exists | That address is already registered — sign in instead |
