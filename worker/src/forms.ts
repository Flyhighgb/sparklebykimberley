import type { Env } from './env';
import { sendEmail, layout, button } from './email';
import { esc, isEmail } from './util';

/** Contact form: emails the owner, with the visitor's address as reply-to. */
export async function handleContact(req: Request, env: Env): Promise<{ ok: boolean; status: number; error?: string }> {
  const f = await req.formData();
  if (f.get('website')) return { ok: true, status: 200 }; // honeypot: silently ignore bots
  const name = String(f.get('name') || '').trim().slice(0, 100);
  const email = String(f.get('email') || '').trim();
  const order = String(f.get('order') || '').trim().slice(0, 50);
  const message = String(f.get('message') || '').trim().slice(0, 5000);
  if (!name || !isEmail(email) || message.length < 2 || !f.get('adult')) return { ok: false, status: 400, error: 'Please fill in all the fields.' };
  await sendEmail(env, {
    to: env.OWNER_EMAIL,
    replyTo: email,
    subject: `💌 Website message from ${name}${order ? ` (order ${order})` : ''}`,
    html: layout(env, `Message from ${name}`, `<p><strong>Email:</strong> ${esc(email)}${order ? `<br><strong>Order:</strong> ${esc(order)}` : ''}</p><p style="white-space:pre-wrap">${esc(message)}</p><p>Just hit reply to answer.</p>`),
  });
  return { ok: true, status: 200 };
}

/** Sparkle Club sign-up (adults only): adds the contact to Resend and sends the welcome email. */
export async function handleNewsletter(req: Request, env: Env): Promise<{ ok: boolean; status: number; error?: string }> {
  const f = await req.formData();
  if (f.get('website')) return { ok: true, status: 200 };
  const email = String(f.get('email') || '').trim().toLowerCase();
  const name = String(f.get('name') || '').trim().slice(0, 60);
  if (!isEmail(email) || !f.get('adult')) return { ok: false, status: 400, error: 'Please enter a valid email and confirm you are 18 or over.' };

  if (env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID) {
    const res = await fetch(`https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ email, first_name: name || undefined, unsubscribed: false }),
    });
    if (!res.ok && res.status !== 409) throw new Error(`Resend contacts: ${res.status} ${await res.text()}`);
  } else {
    // No list set up yet: let the owner know so nobody is lost.
    await sendEmail(env, { to: env.OWNER_EMAIL, subject: 'New Sparkle Club sign-up', html: layout(env, 'New Sparkle Club member', `<p>${esc(name)} &lt;${esc(email)}&gt;</p>`) });
  }
  await sendEmail(env, {
    to: email,
    replyTo: env.OWNER_EMAIL,
    subject: 'Welcome to the Sparkle Club! ✨',
    html: layout(
      env,
      `Welcome to the club${name ? `, ${name}` : ''}!`,
      `<p>I'm so happy you're here. Once a month I'll send you new tutorials, seasonal templates and the odd subscriber-only treat.</p>
      <p>Here's your first batch of free printables to get started:</p>
      ${button(`${env.SITE_URL}/kids-corner#printables`, 'Get your free printables')}
      <p>Happy crafting!<br>Kimberley x</p>
      <p style="font-size:13px;color:#5a5555">You're getting this because you joined the Sparkle Club at sparklebykimberley.co.uk. Don't want these emails? Just reply "unsubscribe" or use the link in any newsletter.</p>`,
    ),
  });
  return { ok: true, status: 200 };
}
