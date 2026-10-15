# Sparkle by Kimberley

The website for **sparklebykimberley.co.uk**: free paper craft tutorials for grown-ups and little hands, plus a shop where every order is sent automatically to the right supplier.

It's built to cost as close to **£0 a month** as possible. Nothing here has a monthly fee. You only pay Stripe's fee when you sell something, and your suppliers for what you sell.

| Job | Service | Cost |
| --- | --- | --- |
| Website hosting | Cloudflare Pages | Free |
| Orders, emails, admin page | Cloudflare Worker + D1 database + Cron | Free tier |
| Printable download files | Cloudflare R2 | Free tier (10 GB) |
| Payments (cards, Apple Pay, Google Pay) | Stripe Checkout | Per-sale fee only |
| Dropshipped products | CJdropshipping | Free account, pay per order |
| Printed merch | Prodigi | Pay per order |
| Emails | Resend | Free tier (3,000 a month) |
| Editing the site from a web page | Pages CMS | Free |
| Visitor stats | Cloudflare Web Analytics | Free, no cookies |

---

## What's in this folder

```
src/content/tutorials/   one Markdown file per tutorial
src/content/products/    one JSON file per product
src/data/settings.json   announcement bar, delivery prices, seasonal spotlight, social links
src/pages/               the pages of the site
public/images/           photos (placeholders for now: swap in your own)
public/printables/       free PDF templates
worker/                  the order Worker (checkout, suppliers, emails, admin page)
scripts/import-cj.mjs    imports products from CJdropshipping
.pages.yml               set-up for the Pages CMS editor
```

---

## 1. Deploying (one-off set-up)

You'll need free accounts at GitHub, Cloudflare, Stripe, Resend, CJdropshipping and Prodigi, and Node.js 20+ on your computer for the first set-up.

### a. Put your domain on Cloudflare

If **sparklebykimberley.co.uk** isn't already managed in Cloudflare:

1. In Cloudflare, click **Add a domain**, type `sparklebykimberley.co.uk` and choose the **Free** plan.
2. Cloudflare gives you two nameservers. Log in where you bought the domain and replace its nameservers with those two.
3. Wait for the email saying the domain is active (usually under an hour, sometimes up to a day).

### b. Publish the website (Cloudflare Pages)

1. Push this folder to a GitHub repository.
2. In Cloudflare go to **Workers & Pages → Create → Pages → Connect to Git** and choose the repository.
3. Settings: Framework preset **Astro**, build command `npm run build`, output folder `dist`. Name the project `sparkle-by-kimberley`.
4. Under **Environment variables** add:
   - `PUBLIC_API_URL` = `https://api.sparklebykimberley.co.uk`
   - `NODE_VERSION` = `22`
   - `PUBLIC_CF_ANALYTICS_TOKEN` = (from step e, can be added later)
5. Click **Save and Deploy**. Then open **Custom domains** and add `sparklebykimberley.co.uk` (and `www.sparklebykimberley.co.uk`).

Every time you change something on GitHub (or in Pages CMS), the site rebuilds by itself in about a minute.

### c. Set up Stripe

1. In Stripe, go to **Settings → Business** and fill in your details. Make sure **Apple Pay** and **Google Pay** are on under **Settings → Payment methods** (they are by default).
2. Create your delivery prices under **Product catalogue → Shipping rates**:
   - "UK delivery", £3.49 → copy its ID (starts `shr_`): this is `STRIPE_SHIPPING_RATE_STANDARD`
   - "Free UK delivery", £0.00 → copy its ID: this is `STRIPE_SHIPPING_RATE_FREE`
   The Worker picks the free one automatically when the basket is £30 or more.
3. Copy your **Secret key** from **Developers → API keys** (start with the `sk_test_` one while testing).

### d. Set up the order Worker

From the project folder on your computer:

```bash
cd worker
npm install
npx wrangler login                       # opens Cloudflare in your browser
npx wrangler d1 create sparkle-orders    # copy the database_id it prints into wrangler.toml
npm run db:init                          # creates the order tables
npx wrangler r2 bucket create sparkle-downloads
```

Add the secrets one at a time (each command asks you to paste the value; they're stored safely in Cloudflare, never in the code):

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_SHIPPING_RATE_STANDARD
npx wrangler secret put STRIPE_SHIPPING_RATE_FREE
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_AUDIENCE_ID       # optional: Resend audience for the Sparkle Club
npx wrangler secret put CJ_API_KEY
npx wrangler secret put PRODIGI_API_KEY
npx wrangler secret put DOWNLOAD_SIGNING_SECRET  # any long random string
npx wrangler secret put ADMIN_PASSWORD           # at least 10 characters
npm run deploy
```

The Worker goes live at `https://api.sparklebykimberley.co.uk`.

Now connect Stripe to it: in Stripe go to **Developers → Webhooks → Add endpoint**:
- URL: `https://api.sparklebykimberley.co.uk/api/stripe-webhook`
- Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`

Copy the endpoint's **Signing secret** (`whsec_…`) and run `npx wrangler secret put STRIPE_WEBHOOK_SECRET`.

Other settings (your email address, free delivery threshold, Prodigi sandbox/live, CJ warehouse) are in `worker/wrangler.toml` under `[vars]`. Run `npm run deploy` again after changing them.

### e. Emails and stats

- **Resend:** add and verify `sparklebykimberley.co.uk` under **Domains** (Resend gives you DNS records to paste into Cloudflare). Create an API key. For the newsletter, create an **Audience** and use its ID as `RESEND_AUDIENCE_ID`.
- **Cloudflare Web Analytics:** in Cloudflare go to **Analytics & Logs → Web Analytics → Add a site**, copy the token, and add it to the Pages project as `PUBLIC_CF_ANALYTICS_TOKEN`. It only loads for visitors who accept it in the cookie banner.

### f. Test before going live

1. Keep Stripe in **test mode** and `PRODIGI_ENV = "sandbox"`.
2. Buy something with Stripe's test card `4242 4242 4242 4242`, any future date, any CVC.
3. Check the order appears on the admin page (section 5) and the emails arrive.
4. When you're happy: swap in your live Stripe key and live webhook secret, set `PRODIGI_ENV = "live"`, and `npm run deploy`.

---

## 2. Adding a tutorial

**The easy way (Pages CMS):**
1. Go to [app.pagescms.org](https://app.pagescms.org) and sign in with GitHub. Choose this repository.
2. Click **Tutorials → Add an entry**.
3. Fill in the boxes: title, who it's for, difficulty, time, photos and steps. Use **Add an entry** under *Steps* for each step, with a photo each.
4. To link an item in *What you'll need* to the shop, type the product's file name (e.g. `quilling-starter-kit`) in the "Shop product" box.
5. Click **Save**. The site rebuilds and your tutorial is live in about a minute. Tick **Draft** if you're not ready to publish yet.

Tips: photos are shrunk automatically, but square-ish 4:3 landscape photos look best. Always fill in the photo description so blind visitors (and Google) know what's in it. For kids' crafts, always add safety notes.

**The hands-on way:** copy any file in `src/content/tutorials/`, rename it (the file name becomes the web address, e.g. `easy-paper-flowers-for-kids.md` → `/tutorials/easy-paper-flowers-for-kids`), and edit it.

## 3. Adding a product by hand

In Pages CMS click **Products → Add an entry**, or copy a file in `src/content/products/`.

The most important box is **Who sends it?** (`fulfilment`):

| Value | What happens when it's bought | What to fill in |
| --- | --- | --- |
| `cj` | Order is created at CJdropshipping automatically | CJ variant ID (`vid`), warehouse (`DE` for Germany) |
| `prodigi` | Order is created at Prodigi automatically | Prodigi SKU (from the Prodigi product catalogue) and a link to your full-size print artwork (`assetUrl`) |
| `digital` | Customer is emailed a download link that works for 7 days | Download file name in R2, e.g. `printables/my-pack.pdf` |
| `manual` | **You** get an email with everything needed to order it from the supplier | Supplier name, product link and SKU |

Also fill in price (in £, including VAT), your cost price (never shown to customers), estimated delivery time and photos. For children's products, tick **Children's product** and fill in the age suitability and the UKCA/CE safety warning from the supplier.

**Uploading a printable for sale:** in Cloudflare open **R2 → sparkle-downloads → Upload**, put the file in a `printables/` folder, and use that name (e.g. `printables/my-pack.pdf`) as the download file name.

> The 8 starter products use **sample supplier IDs**. Before selling them for real, replace them with real CJ products (section 4), a real Prodigi SKU and artwork for the tote bag, real Pound Wholesale SKUs, and upload the two printable packs to R2. Until then those orders will show as failed on the admin page.

## 4. Importing dropship products from CJdropshipping

1. Get your API key in CJ under **My CJ → Authorization → API**. Put it in a file called `.env` in the project folder: `CJ_API_KEY=your-key` (copy `.env.example`; `.env` is never uploaded).
2. Search: `npm run import:cj -- --search "quilling kit"`. You'll see a list of product IDs and prices.
3. Import one: `npm run import:cj -- --id <product ID> --category "Craft Kits (Adults)"`

The script downloads and shrinks the photos, works out the cheapest UK shipping (trying CJ's **German warehouse first** for faster delivery), converts the cost to pounds, adds your markup (`cost × 2.5`, rounded up to .99), estimates the delivery time, and saves the product **as a draft**.

4. Open the new product in Pages CMS, rewrite the description in your own words, check the photos and safety info, untick **Draft** and save.

Change the markup, rounding and preferred warehouse in `scripts/import.config.json`, or for one product add `--markup 3`.

**Paying CJ:** CJ only ships an order once it's paid. Keep your CJ wallet topped up and turn on automatic payment from your balance in CJ's settings, or pay new orders in the CJ dashboard.

## 5. Checking orders (admin page)

Go to **https://api.sparklebykimberley.co.uk/admin** and log in with any username and your `ADMIN_PASSWORD`.

You'll see every order with each item's supplier and status:

- **With supplier**: sent to CJ or Prodigi; tracking is checked every 3 hours and the customer is emailed when it ships.
- **You need to order this**: a "manual" item. Order it from the supplier using the email you received, then click **Mark shipped**, add the tracking number, and the customer is emailed.
- **Done (download sent)**: the customer has their download link.
- **FAILED**: something went wrong (the reason is shown in red). The system retries automatically twice. Once you've fixed the cause, press **Retry**. You also get an email whenever something fails.

Each order has a **History** list showing everything that happened to it.

## 6. Adding a new supplier

The Worker uses "supplier adapters", so a new supplier doesn't need any changes to the website.

1. Copy `worker/src/suppliers/manual.ts` (no API) or `worker/src/suppliers/prodigi.ts` (has an API) to a new file, e.g. `mysupplier.ts`.
2. Change `id` (e.g. `'mysupplier'`) and `label`, then fill in:
   - `submit()`: send the order lines to the supplier and return their order number.
   - `checkStatus()` (optional): ask the supplier if it's shipped and return the tracking number.
3. Add it to the list in `worker/src/suppliers/index.ts`.
4. Add `'mysupplier'` to `FULFILMENT` in `src/content.config.ts` and to the "Who sends it?" options in `.pages.yml`.
5. Store any API key with `npx wrangler secret put MYSUPPLIER_API_KEY`, add it to `worker/src/env.ts`, and `npm run deploy`.

## 7. Everyday changes

- **Announcement bar, delivery price, seasonal spotlight, social links:** Pages CMS → **Site settings**. If you change the delivery price or free-delivery threshold, change it in Stripe (shipping rates) and `worker/wrangler.toml` too.
- **Photos:** the starter photos are colourful placeholders. Replace them with your own, keeping the same file names, or pick new ones in the CMS.
- **Working on your computer:** `npm install`, then `npm run dev` and open http://localhost:4321.

## Good to know (please check)

- **VAT:** prices are shown "incl. VAT". If you're not VAT registered, change the price note in Site settings (e.g. "No VAT added").
- **Imported goods:** for parcels sent from outside the UK (e.g. CJ's EU or China warehouses) worth £135 or less, UK import VAT is normally due from the seller. Check with an accountant how this applies to you before selling CJ products.
- **Legal pages** are written as a sensible starting point for a small UK shop, not legal advice. Have a read and adjust them to how you actually run things.
- **Kids' safety:** only sell children's craft kits that the supplier confirms are UKCA or CE marked, and copy their age warnings into the product.
