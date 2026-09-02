# One More Swap — Product Specification

**Product name:** One More Swap  
**Domain:** onemoreswap.com  
**Studio:** JAND Games (legal / ops umbrella — not required on the public marketing site)  
**Version:** 1.2  
**Status:** Internal guideline (offline forever — plan for us, not public docs)  
**Last updated:** September 2026

---

## 0. How to use this document

These files in `One More Swap/` are **internal only**: product plan, design intent, and legal draft thinking. They are not published to users. Update them when we change our minds; do not treat them as marketing copy.

Companion files:

- `onemoreswap-palette.html` — design system (colours, type, components)
- `terms-and-conditions.md` — draft T&Cs structure for launch (still internal until reviewed)

---

## 1. Overview

A web platform that helps sticker album collectors find, coordinate, and complete swaps with other collectors. Three tiers — personal contacts → copy-paste tool → algorithm-matched strangers — with a reputation system that self-regulates without manual dispute handling by the operator.

The platform is an **introduction service**, not a marketplace. When fees exist, they cover the match and introduction. Postal outcomes, sticker condition, and delivery remain the responsibility of the parties involved.

### Positioning

- **Public brand:** One More Swap (product identity)
- **Domain:** onemoreswap.com
- **Studio umbrella:** JAND Games (operator, invoices, ICO, source control org as needed). Need not appear in the site hero or wordmark.
- **Name tone:** Collector-native — every parent has heard *“I just need one more!”* Family-safe, wholesome UI. No double meanings, no winking at alternate readings.
- **Tagline (draft):** *One more swap. Finish the album.* or *Just need one more?*

---

## 2. Target Users

- Sticker album collectors (primary: adults for themselves or children)
- Initially: UK-based
- Entry point: people already swapping in WhatsApp / Facebook groups
- Tone: useful for families; UI stays wholesome; copy can be warm and collector-native

---

## 3. Album roadmap (critical)

World Cup cycles are **spikes**. The product is a **multi-album swap OS**, not a one-tournament firework.

| Phase | Albums | Role |
|---|---|---|
| Launch spine | Panini World Cup 2026 **and** Topps Premier League | WC = acquisition spike; PL = habit / retention |
| Next | Euro, next WC, other leagues / albums as demand appears | Same engine, new catalogues |

**Do not wait until WC ends to ship PL.** Overlap while WC hype exists so accounts stay warm into the league season.

UI: platform chrome is album-agnostic; each album gets scoped accent colours (see design system).

---

## 4. Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React |
| Source control | GitHub |
| Hosting | Cloudflare Pages |
| Server logic | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Authentication | Auth.js with Google OAuth |
| Email | Cloudflare Email Workers or third-party (e.g. Resend) |

### Key decisions

- **Email + password** (own D1 accounts, PBKDF2 hashes). Cloudflare Turnstile on signup/login. No Google OAuth.
- **No self-hosted server.** Cloudflare for compute and storage.
- **Addresses auto-purged** 30 days after trade complete / auto-confirm.
- **Video proofs auto-purged** 30 days after upload.

---

## 5. Legal and Compliance

### ICO Registration

Personal data (email, collection data, trade history) → UK GDPR. Operator registers with the ICO (~£40/year). Operator entity: JAND Games / individual as registered.

### Lawful Basis

**Contract performance** — data used only to provide the service. No marketing without separate consent.

### Data Minimisation

- Addresses only at trade confirmation
- Addresses deleted 30 days post-completion
- Video proof deleted 30 days post-upload
- No data beyond what matching needs

### Privacy Policy & Terms

Plain-English privacy policy at public launch. Terms must state: introduction service (not marketplace); fee covers match not postal outcome; trade at own risk; automated reputation affects matching. Draft lives in `terms-and-conditions.md` — have a qualified review before public launch.

### Intellectual Property

No Panini / Topps / manufacturer licensed artwork. Collection data (numbers, player names) is factual user-entered information.

---

## 6. Three-Tier Matching System

### Tier 1 — Contacts (always free)

Users in each other's referral network. No algorithm fee, no strangers.

- Mutual needs/spares only — not full collections
- Overlaps highlighted in real time
- Face-to-face allowed at users' discretion
- No strikes / reputation on Tier 1 disputes

### Tier 2 — Copy-Paste Matcher (always free)

Standalone tool; account optional.

- Paste lists in common formats; instant overlap with own collection
- Primary growth / discovery funnel (also a natural place for an optional tip jar later)

### Tier 3 — Platform Matching (free at launch; paid structure reserved)

Algorithm matching between strangers.

- Reputation-weighted
- Payment-preference filtered (when fees exist)
- Distance as approximate miles (no address/name early)
- **Post only** — no face-to-face for Tier 3
- Free allowance / fully free while liquidity is thin (see Monetisation)
- Extra matches via referrals; later via paid priority/capacity

---

## 7. Collection Management

### Sticker States

| State | In needs | In spares | Colour cue |
|---|---|---|---|
| Missing | Yes | No | Red |
| In album | No | No | Neutral |
| Duplicate | No | Yes | Amber / yellow |
| Expected inbound | No | No | Blue-ish / info |
| Sent outbound | No | No | Distinct “sent” cue |

### Adding Stickers

Bulk / any common format:

- `MEX 1, 2, 3`
- `MEX1 MEX2 ARG7`
- `570 571 572`
- Combinations, comma or space separated

Missing → album; already in album → duplicate.

### Persistence

- localStorage between sessions (same browser)
- Export/Import JSON for backup / cross-device
- Synced to D1 when logged in

---

## 8. Trading Flow

```
Match found
    ↓
Both review stickers (no names/addresses)
    ↓
Both accept
    ↓
Payment arrangement (when fees exist) / skip while fully free
    ↓
Addresses shared
    ↓
Sender marks SENT → 14-day clock
    ↓
Recipient RECEIVED — or — auto-confirm at day 14
    ↓
Complete → addresses purged after 30 days
```

### 3-Step Trade Tracking

1. **Sent** — sender, timestamp  
2. **In transit** — days remaining  
3. **Received** — recipient or auto-confirm day 14  

### Postal only (Tier 3)

Onboarding advice: standard letter post; keep own record; optional film posting; first name only on envelope.

---

## 9. Payment (between users for postage / match fee preference)

### Who pays the match fee (when fees exist)

Requester chooses: **I pay** / **They pay** / **We split**. Profile preference filters matches before surfacing.

### Postage

Each party always pays own postage. Non-negotiable.

### Charge point (when charging)

Fee at **mutual acceptance** — introduction delivered. Explicit acknowledgement checkbox. No cash refunds after acceptance; goodwill **credits** on confirmed no-show.

---

## 10. Reputation System

Fully automated. Operator does not investigate individual disputes. Formula unpublished; users know score affects matching priority.

### Score inputs

Clean swaps, strikes (current/historical), report history, account age/activity.

### Strikes — Senders

- No-show report → strike  
- Video proof of posting → **half strike**  
- 3 strikes → 1 month Tier 3 suspension; then 2 / 4 / 8 months…  
- Return → strike clock resets  
- Fade: **3 consecutive clean swaps** cancel **1 strike**

### Strikes — Reporters

Suspicious report = against well-reputed user (10+ clean swaps, &lt;2 active strikes).

- 2nd suspicious in last 3 txs → half strike on reporter  
- 3rd → full strike  
- Same suspension / fading rules  
- Fade: **3 clean reports** cancel **1** dodgy-report strike  

### Goodwill Credits

Confirmed no-show against recipient → automatic match credits (no cash, no cap; anti-farm via reporter rules).

### Video Proof

Optional; intent evidence not delivery proof; purged 30 days.

---

## 11. Postal Trade Management

Trade record fields: ID, tier, matched user (name after accept), stickers sent/expected, payment arrangement, status, dates, addresses (purged), video URL (purged), strikes.

Sticker state moves: outbound → Sent; inbound → Expected; complete → In album; no-show → Missing + goodwill.

---

## 12. Notifications

Email on: match found; other party accepted; payment confirmed (when relevant); address shared; marked sent; 3 days before auto-confirm; auto-confirm; strike; suspension on/off; goodwill credits.

---

## 13. Referral System

- Unique link  
- Referred user signs up + first swap → referrer bonus match credits  
- Referred user joins referrer’s Tier 1 network  
- Credits do not expire  
- One level only (A for B, not C)

---

## 14. Onboarding messages

1. Introduction service — not responsible for post  
2. Tier 3 = post only; face-to-face only with people you know (Tier 1)  
3. Keep your own send record  
4. Optional film posting — protects reputation  
5. Reputation affects match quality  
6. Addresses shared then deleted after 30 days  

---

## 15. Monetisation (agreed strategy)

### Launch: free-first (not suicidal — correct for thin liquidity)

Charging before density is what kills matching products. **Launch Tier 3 free** (or a free allowance so generous it never hits a wall in practice). Structure the product so paid tiers can turn on later without a redesign.

### Why not early per-match (£0.50–£1)

Payment gateway fixed fees destroy microtransactions. Bad unit economics.

### Why not prepaid match bundles while liquidity is thin

Users pay → no matches (empty room or albums nearly complete) → rage, chargebacks, “scam” reviews. Spec already cannot guarantee matches; prepaid inventory makes that feel like a lie.

### When to turn money on

Only when metrics show the room is full enough, e.g.:

- Active users regularly get decent matches in days, not weeks  
- Accept and complete rates are healthy  
- Mid-collection demand still exists (not only “last 5 stickers” hell)

### What to charge for later

Prefer **priority / capacity** (higher free cap, faster matching, subscription or season credits) over “pay for hope of a match.” If credits are sold, prefer **non-expiring until season end** with clear no-guarantee language — still secondary to proven liquidity.

### Donations

Optional “buy me a coffee” / tip jar is fine as a **side** signal (especially near Tier 2). Not the business model. Footer/settings is enough.

### Reserved fee table (future)

| Feature | Intent |
|---|---|
| Tier 1 | Always free |
| Tier 2 | Always free |
| Tier 3 launch | Free / effectively free |
| Tier 3 later | Priority or extra capacity — not predatory per-match |
| Referrals | Extra free matches |
| Goodwill | Credits only, no cash |

Suggested historic ballpark if ever pay-per-match: £0.50–£1 with bundles — **deferred until volume**; revisit then.

---

## 16. Brand & design (summary)

Full tokens and components: `onemoreswap-palette.html`.

| Rule | Detail |
|---|---|
| Product name | One More Swap |
| Domain | onemoreswap.com |
| Wordmark | Plain text **One More Swap** (Russo One) |
| Wordmark mark | The styled <strong>O</strong> is the mark (no trailing stamp) |
| Default UI | **Light** warm neutrals |
| Yellow `#FFD700` | **Fill** — primary CTAs, spare chips |
| Red `#B42338` | **Border + text** — need/danger; no red/pink backgrounds on platform chrome |
| Red dark `#8B1A2C` | Labels, links, error text |
| PL purple `#37003C` | **Album accent only** (+ optional dark-mode tint) |
| WC header red `#C41E3A` | Album match headers only (can be bolder than platform red) |
| Dark mode | Optional; **grey** primary type (`#C5C0C8`), not white |
| Fonts | Russo One (display) + DM Sans (body/UI) |
| Studio | JAND Games behind the scenes |

---

## 17. Future considerations

- Multi-album (WC, PL, Euro, CL, etc.) — **core roadmap**, not optional fluff  
- Mobile app (React Native) later  
- Premium reputation badge (contacts only)  
- Seasonal matching events  
- Light community surface to reduce CS  
- API import/export for third-party trackers  
- Optional tip jar  

---

## 18. Out of scope (v1)

- Live parcel tracking integration  
- Escrow  
- Physical grading  
- Buying/selling stickers  
- Face-to-face coordination for Tier 3  

---

*Internal living document. Reflects product decisions through September 2026 including free-first monetisation, One More Swap branding (onemoreswap.com), JAND Games umbrella, and WC + Premier League dual-album spine.*
