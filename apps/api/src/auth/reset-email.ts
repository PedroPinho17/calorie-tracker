import type { Mail } from '../mail/mail.service.js';

type Locale = 'pt' | 'en';

const COPY = {
  pt: {
    subject: 'Recupera a tua password — Calorie Tracker',
    title: 'Definir uma password nova',
    intro: 'Recebemos um pedido para mudar a password da tua conta no Calorie Tracker.',
    button: 'Definir password nova',
    expiry: (min: number) => `O link expira em ${min} minutos e só pode ser usado uma vez.`,
    ignore: 'Se não foste tu, ignora este email — a tua password continua igual.',
    fallback: 'Se o botão não funcionar, copia este link para o browser:',
  },
  en: {
    subject: 'Reset your password — Calorie Tracker',
    title: 'Set a new password',
    intro: 'We received a request to reset the password for your Calorie Tracker account.',
    button: 'Set new password',
    expiry: (min: number) => `This link expires in ${min} minutes and can only be used once.`,
    ignore: "If this wasn't you, ignore this email — your password stays the same.",
    fallback: "If the button doesn't work, copy this link into your browser:",
  },
} as const;

/**
 * Email com o link de recuperação. O link só tem a origem configurada (WEB_ORIGIN) e um
 * token base64url — nada vindo do utilizador — por isso pode ir tal e qual para o HTML.
 */
export function resetPasswordEmail(to: string, link: string, locale: Locale, ttlMinutes: number): Mail {
  const c = COPY[locale];
  const text = [c.intro, '', `${c.button}: ${link}`, '', c.expiry(ttlMinutes), c.ignore].join('\n');
  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#f4f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#16843f;padding:20px 28px;color:#ffffff;font-size:15px;font-weight:600">Calorie Tracker</td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 12px;font-size:20px">${c.title}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#444">${c.intro}</p>
      <a href="${link}" style="display:inline-block;background:#16843f;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${c.button}</a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#666">${c.expiry(ttlMinutes)}<br>${c.ignore}</p>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#888">${c.fallback}<br><span style="word-break:break-all">${link}</span></p>
    </td></tr>
  </table>
</body>
</html>`;
  return { to, subject: c.subject, text, html, devPreview: link };
}
