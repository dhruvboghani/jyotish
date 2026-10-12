# Kundali Ganit v2

Vedic Kundali site with Supabase login, a login-gated full report, saved charts, six languages and SEO pages.

## How it fits together

```
Browser (public/<lang>/index.html + assets/app.js)
   │  POST /api/kundali  { birth details }  + Authorization: Bearer <supabase access token, if logged in>
   ▼
Vercel function api/kundali.js
   ├─ no / invalid token → preview only: Lagna, Moon sign, Nakshatra
   └─ valid token        → full report (charts, grahas, yogas, dasha, panchang, bhavas, ashtakavarga, gochar)
                           and upserts the birth details into Supabase table `kundalis` (RLS: owner only)
```

All astronomy runs on the server (`lib/engine.js`, `lib/analysis.js`, `lib/report.js`), so the full chart cannot be read from page source without logging in.

| Path | Purpose |
|---|---|
| `api/kundali.js` | Serverless endpoint: verifies the Supabase JWT, gates the response, saves the chart |
| `lib/` | Calculation engine, rule-based analysis, report builder |
| `src/` | Page template, styles, client app, illustration sprite, birth-place list |
| `locales/*.json` | Translations: `en` `hi` `gu` `ta` `te` `kn`. `_sanskrit.json` holds Sanskrit terms that are transliterated automatically |
| `build.js` | Generates `/`, `/hi/`, `/gu/`, `/ta/`, `/te/`, `/kn/` with per-language SEO tags, JSON-LD, sitemap and robots |
| `supabase/schema.sql` | Table + Row Level Security policies |

## 1. Supabase

1. Create a project at supabase.com.
2. **SQL Editor** → paste `supabase/schema.sql` → Run.
3. **Authentication → URL Configuration**
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/**`, plus `https://*-your-team.vercel.app/**` for preview deploys and `http://localhost:3000/**` for local dev.
4. **Authentication → Providers**
   - Email is on by default. Keep "Confirm email" on; the site tells users to check their inbox.
   - Google (optional): create an OAuth client in Google Cloud, set its redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`, then paste the client ID and secret here. If you skip this, hide the Google button in `src/app.js` (`authModal`).
5. **Project Settings → API**: copy the Project URL and the `anon` public key.

## 2. Vercel

1. Replace the old files in your repo with this project and push.
2. **Settings → Environment Variables** (Production, Preview and Development):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SITE_URL`, your live domain without a trailing slash. This is used in canonical, hreflang, sitemap and og:image URLs.
3. Redeploy. `vercel.json` sets the build command (`npm run build`), the output folder (`public`) and no framework preset. If the project settings override these, clear the overrides.

Local development:

```bash
npm install
cp .env.example .env.local   # fill in the values
npx vercel dev
```

## 3. SEO

- Each language has its own URL and fully translated HTML: title, description, hero, features, about and FAQ. Search engines index each one separately.
- Each page includes `hreflang` alternates and `x-default`, a canonical URL, Open Graph and Twitter tags, and JSON-LD for WebApplication, FAQPage and WebSite.
- `sitemap.xml` lists all six URLs with alternates; `robots.txt` blocks `/api/`.
- After the first deploy: add the domain in Google Search Console, submit `https://your-domain.com/sitemap.xml`, and request indexing for the six language URLs.
- Google currently shows FAQ rich results mostly for government and health sites. The FAQ schema still helps search engines understand the page, and the visible FAQ text targets long-tail queries such as "manglik dosha kya hai".

## 4. Languages

- Edit text in `locales/<lang>.json`. Any key missing there falls back to English at build time.
- Placeholders such as `{g}`, `{r}`, `{h}` and `{list}` must stay exactly as written.
- Yoga, karana, Avakahada values, house names and name syllables come from `locales/_sanskrit.json`. They are transliterated automatically into Gujarati, Telugu and Kannada (one-to-one script mapping) and into Tamil (approximate mapping). A locale can override any of these lists.
- Hindi and Gujarati are ready to use. Have a native speaker review Tamil, Telugu and Kannada before launch, especially regional terms.
- To add a language: create `locales/xx.json`, add `xx` to `LANGS` in `build.js`, and add a font in `FONTS`.

## 5. Before launch

- Add rate limiting to `/api/kundali`, for example with Upstash Redis or Vercel's firewall rules. Each full report takes about 150 ms of compute.
- Customise Supabase's auth email templates (confirm signup, reset password) with your branding.
