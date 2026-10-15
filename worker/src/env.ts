export interface Env {
  DB: D1Database;
  DOWNLOADS: R2Bucket;

  // Plain settings (wrangler.toml [vars])
  SITE_URL: string;
  API_URL: string;
  ALLOWED_ORIGINS: string;
  OWNER_EMAIL: string;
  EMAIL_FROM: string;
  FREE_DELIVERY_THRESHOLD_PENCE: string;
  DOWNLOAD_LINK_DAYS: string;
  PRODIGI_ENV: string;
  CJ_FROM_COUNTRY: string;
  CJ_FALLBACK_COUNTRY: string;
  CJ_LOGISTIC_NAME: string;

  // Secrets (npx wrangler secret put NAME)
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_SHIPPING_RATE_STANDARD: string;
  STRIPE_SHIPPING_RATE_FREE: string;
  CJ_API_KEY?: string;
  PRODIGI_API_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_AUDIENCE_ID?: string;
  DOWNLOAD_SIGNING_SECRET: string;
  ADMIN_PASSWORD: string;
}
