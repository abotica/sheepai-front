# Newsletter + Resend — setup checklist

Use this after the code is deployed (e.g. Vercel). Check items off as you go.

---

## 1. Domain (required for real subscribers)

Resend needs a **verified domain** before you can reliably send the daily digest to arbitrary signup addresses.

- [ ] Buy or use a domain you control (registrar + DNS — Cloudflare free tier works).
- [ ] In [Resend Dashboard](https://resend.com/domains) → **Domains** → add domain.
- [ ] Add the DNS records Resend shows (SPF/DKIM, etc.) until status is **Verified**.
- [ ] Decide sender address, e.g. `newsletter@your-domain.com` (must be on that domain).

---

## 2. Resend project

- [ ] Create/locate API key with **Contacts + Sending** (not “sending only” — signup uses Contacts API).
- [ ] Create a **Segment** (Audience) for newsletter subscribers.
- [ ] Copy **Segment ID** → use as `RESEND_SEGMENT_ID` (same segment the app adds contacts to on signup).
- [ ] Optional: configure a **Topic** for legal opt-out and copy **Topic ID** → `RESEND_TOPIC_ID`.

---

## 3. Vercel environment variables (Production)

Project → Settings → Environment Variables:

| Variable | What to put |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key (`re_…`). |
| `RESEND_SEGMENT_ID` | Segment UUID from Resend (must match signup segment). |
| `RESEND_FROM` | `Display Name <newsletter@your-domain.com>` on verified domain. |
| `CRON_SECRET` | Long random string (e.g. `openssl rand -hex 32`). Vercel Cron sends `Authorization: Bearer …`. |
| `NEXT_PUBLIC_APP_URL` | Canonical site URL, e.g. `https://your-app.vercel.app` or custom domain (helps cron fetch `/data/cruises.json` + footer link). |
| `RESEND_TOPIC_ID` | Optional — only if you use Resend topics for subscriptions. |

- [ ] All required vars set for **Production**.
- [ ] Redeploy after changing env vars.

---

## 4. Cron job

Repo includes `vercel.json` with a daily cron hitting `/api/cron/daily-newsletter`.

- [ ] Deploy so Vercel registers the cron (check **Cron Jobs** in the project).
- [ ] Ensure `CRON_SECRET` matches what Vercel uses for secured cron (Bearer header).

Default schedule is **05:00 UTC** (~morning Croatia depending on DST). Change `vercel.json` if you want another hour.

---

## 5. Smoke test

- [ ] Sign up once via the site → confirm contact appears in Resend under the correct segment.
- [ ] Manual trigger (replace placeholders):

```bash
curl -s -X POST "https://YOUR_DOMAIN/api/cron/daily-newsletter" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expect JSON like `{ "ok": true, "isoDate": "…", "ships": N, "recipientsSent": M, "batches": … }`.

- [ ] On failure, check Vercel **Functions** logs for codes such as `missing_from`, `resend_list_error`, `resend_batch_error`.

---

## 6. Data freshness

Digest ships come from **`/data/cruises.json`** on the deployed site when fetch succeeds; otherwise bundled JSON.

- [ ] After pipeline updates (`scripts` → `build:data` / sync), deploy or ensure `public/data/cruises.json` on production matches what users see.

---

## Quick reference — routes

| Route | Role |
|-------|------|
| `POST /api/newsletter` | Adds email to Resend Contacts (+ segment). |
| `GET` or `POST /api/cron/daily-newsletter` | Daily digest (Bearer `CRON_SECRET`). |
