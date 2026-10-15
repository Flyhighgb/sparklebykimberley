import type { Env } from './env';
import { esc } from './util';

export interface Email {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/** Send an email through Resend (free tier: 3,000 emails a month). */
export async function sendEmail(env: Env, email: Email): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set; email "${email.subject}" was not sent`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: Array.isArray(email.to) ? email.to : [email.to],
      subject: email.subject,
      html: email.html,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Email failed (${res.status}): ${await res.text()}`);
}

/** Wrap content in the cheerful branded email layout. */
export function layout(env: Env, heading: string, body: string): string {
  return `<!doctype html><html lang="en-GB"><body style="margin:0;background:#FFF1EE;font-family:Nunito,Arial,sans-serif;color:#2B2B2B;font-size:16px;line-height:1.6">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
  <p style="text-align:center;margin:0 0 16px"><span style="font-family:Pacifico,'Brush Script MT',cursive;font-size:30px;color:#B0245F">Sparkle</span> <strong style="font-size:18px">by Kimberley</strong> <span style="color:#FFD23F;font-size:22px">★</span></p>
  <div style="background:#fff;border:3px solid #2B2B2B;border-radius:18px;padding:24px">
    <h1 style="font-size:22px;margin:0 0 12px">${esc(heading)}</h1>
    ${body}
  </div>
  <p style="text-align:center;font-size:13px;color:#5a5555;margin-top:16px">Sparkle by Kimberley · <a href="${env.SITE_URL}" style="color:#245CA8">sparklebykimberley.co.uk</a><br>Questions? Just reply to this email.</p>
</div></body></html>`;
}

export function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:#FFD23F;color:#2B2B2B;border:2px solid #2B2B2B;border-radius:999px;padding:12px 22px;font-weight:800;text-decoration:none">${esc(label)}</a></p>`;
}
