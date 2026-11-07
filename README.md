# Vera & Alisa · A gift that grows

A small static website that invites friends and relatives to give Vera and Alisa a contribution to their
**Trump Accounts** instead of toys for birthdays and holidays. English and Russian, with a language toggle
that remembers the choice.

![Preview](assets/img/og-image.jpg)

It is a personal family page, not an official Trump Accounts site, and it says so on the page.

- Plain HTML, CSS and JavaScript: **no build step**, no dependencies.
- Responsive, keyboard-accessible, and respects "reduce motion".
- Interactive growth calculator: illustrative only, with clearly stated assumptions.

## Pages

| URL | What it is |
| --- | --- |
| `/` | Family page for both girls |
| `/vera/` | Vera's own landing page, for her birthday invites |
| `/alisa/` | Alisa's own landing page, for her birthday invites |

Once published, share for example **https://chernetsov.github.io/kids-trump-accounts/vera/**.
Each child's page uses the same design and text, focused on one girl: "Give Vera a gift that grows", her photo,
a countdown to her birthday, a calculator for her alone, her Contribute card, and a link to her sister's page.
Link previews in WhatsApp, Telegram and iMessage show her photo (`assets/img/og-vera.jpg`, `og-alisa.jpg`).

The child pages (`vera/index.html`, `alisa/index.html`) are **generated** from `index.html`. Don't edit them by hand.
After changing `index.html`, run:

```bash
python3 tools/build_kid_pages.py
```

The deploy workflow also runs this script on every publish, so the published pages are always in sync.
The page-specific wording lives in `assets/js/i18n.js` under the `kid.*` keys.

## Preview locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Publish on GitHub Pages

The repo includes a workflow (`.github/workflows/pages.yml`) that publishes the site on every push to `main`.

1. On GitHub, open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Merge to `main`, or run the workflow manually under **Actions → Deploy to GitHub Pages → Run workflow**.
4. The site appears at **https://chernetsov.github.io/kids-trump-accounts/** (the URL is also shown in the workflow run).

Alternative without Actions: under **Source** choose **Deploy from a branch**, then pick `main` and `/ (root)`.
That also works, because the site has no build step.

> GitHub Pages sites are public, even for unlisted pages. The page has `noindex` so search engines skip it,
> but anyone with the link can open it.

## Where to put links, handles and photos

Everything you need to edit lives in **one file: [`assets/js/config.js`](assets/js/config.js)**.
Search it for `PLACEHOLDER`. Any value left as `""` shows a friendly "coming soon" state on the site.

| What | Config key | Notes |
| --- | --- | --- |
| Vera's contribution link | `kids[0].contributeUrl` | Trump Accounts app → Vera's account → QR icon (top left) → **Share link**. Paste the URL. |
| Alisa's contribution link | `kids[1].contributeUrl` | Same steps in Alisa's account. |
| QR codes (optional) | `kids[n].qrImage` | Save the QR image from the app as `assets/qr/vera-qr.png` / `assets/qr/alisa-qr.png`, then set the path. |
| Wise | `abroad.wise.url`, `abroad.wise.handle` | A `wise.com/pay/me/...` link and/or your @Wisetag. A handle gets a **Copy** button. |
| PayPal | `abroad.paypal.url`, `abroad.paypal.handle` | A `paypal.me/...` link and/or your PayPal email. |
| Contact (optional) | `contactUrl` | `mailto:you@example.com`, `https://t.me/username`, etc. Shows "Questions? Message Misha". |
| Calculator defaults | `calculator` | Default gift, default return (7%), inflation used for "today's dollars" (3%), annual limit. |

### Photos

Photos live in **`assets/photos/`**:

| File | Used for |
| --- | --- |
| `assets/photos/vera.webp`, `vera.jpg` | Vera's card, hero and calculator avatar |
| `assets/photos/alisa.webp`, `alisa.jpg` | Alisa's card, hero and calculator avatar |

To replace a photo, use the helper script. It applies the phone's rotation, **removes all EXIF/GPS metadata**,
converts to sRGB, crops to a 4:5 portrait, resizes to 1200 px tall and writes both WebP and JPEG:

```bash
pip install pillow
python3 tools/optimize_photo.py ~/Downloads/IMG_1234.jpg vera
# optional crop box (left top right bottom, as 0..1 fractions of the photo):
python3 tools/optimize_photo.py ~/Downloads/IMG_1234.jpg alisa --box 0.38 0.25 0.94 0.78
```

The paths are set in `config.js` under `kids[n].photo`. `focus` (CSS `object-position`) controls which part of the
photo stays visible on the square card crop. If a child has no `photo` entry, the site shows a tasteful
monogram placeholder instead.

The link preview images for WhatsApp, Telegram and iMessage are `assets/img/og-image.jpg` (family page) and
`assets/img/og-<id>.jpg` (each child's page). Their source is `tools/og-image.html` (add `?kid=vera` for a child).
Re-render them at 1200×630 with any headless browser if you change the photos.

## Text and translations

All visible text is in [`assets/js/i18n.js`](assets/js/i18n.js), with `en` and `ru` blocks using the same keys.
The language is picked from the toggle (saved in `localStorage`), or from the browser language on the first visit.

## Facts used on the page

From the official pages:
[Trump Accounts overview](https://trumpaccount.com/us/en/support/articles/overview/) and
[Make a contribution](https://trumpaccount.com/us/en/support/articles/make-a-contribution/).

- A tax-deferred investment account (traditional IRA rules) for U.S. children under 18. It becomes a traditional IRA at 18.
- Contributions are invested automatically in an S&P 500 index fund.
- Family and friends can give up to a combined $5,000 per child per year. A gift counts toward the calendar year it's sent.
- Contributions close on December 31 of the year the child turns 17. The calculator stops yearly gifts there.
- The $1,000 Treasury seed is only for children born 2025–2028, so the site does **not** claim it for Vera or Alisa.

## Project structure

```
index.html                 page markup (text comes from i18n.js)
vera/, alisa/              each child's page, generated from index.html
assets/css/styles.css      all styles
assets/js/config.js        ← links, handles, photos, birthdays, calculator defaults
assets/js/i18n.js          English + Russian text
assets/js/app.js           language toggle, calculator & chart, cards
assets/photos/             child photos (optimized, metadata stripped)
assets/qr/                 put QR code images here
assets/img/                favicon and link-preview image
tools/optimize_photo.py    photo optimizer (strip EXIF/GPS, crop, resize)
tools/build_kid_pages.py   generates vera/ and alisa/ from index.html
tools/og-image.html        source of the link-preview images
.github/workflows/pages.yml  GitHub Pages deploy
```
