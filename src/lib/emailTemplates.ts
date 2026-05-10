// Brand-styled HTML email templates for Backupshala (Resend via send-email edge fn)
const BRAND = '#16a34a';
const ACCENT = '#f97316';
const SITE = 'https://backupshala.com';

const wrap = (title: string, body: string, ctaText?: string, ctaUrl?: string) => `
<!doctype html><html><body style="margin:0;background:#f6f7f8;font-family:Arial,sans-serif;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <tr><td style="background:${BRAND};padding:20px 28px;color:#fff">
        <span style="font-size:20px;font-weight:800">Backup<span style="color:#fed7aa">shala</span></span>
      </td></tr>
      <tr><td style="padding:28px">
        <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
        <div style="font-size:14px;line-height:1.6;color:#334155">${body}</div>
        ${ctaText && ctaUrl ? `<div style="margin:24px 0"><a href="${ctaUrl}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">${ctaText}</a></div>` : ''}
      </td></tr>
      <tr><td style="padding:18px 28px;background:#f9fafb;color:#64748b;font-size:12px;border-top:1px solid #e5e7eb">
        Need help? Email <a href="mailto:support@backupshala.com" style="color:${BRAND}">support@backupshala.com</a><br/>
        © ${new Date().getFullYear()} Backupshala. All rights reserved.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

export const emailTpl = {
  welcome: (name: string) => ({
    subject: 'Welcome to Backupshala! 🎉',
    html: wrap('Welcome aboard, ' + (name || 'Creator') + '! 🎉',
      `<p>Your account is ready. Start exploring courses or launch your own creator journey.</p>
       <p>Earn ₹75 for every friend who enrolls using your referral link.</p>`,
      'Explore Courses', `${SITE}/courses`)
  }),
  enrollmentConfirmed: (name: string, courseTitle: string, paymentId: string) => ({
    subject: `Enrollment confirmed: ${courseTitle} ✅`,
    html: wrap('You\'re enrolled! 🎓',
      `<p>Hi ${name || 'there'}, your enrollment in <strong>${courseTitle}</strong> is confirmed.</p>
       <p>Your invoice is available in your dashboard.</p>`,
      'Start Learning', `${SITE}/dashboard`)
  }),
  commissionEarned: (name: string, amount: number, courseTitle: string) => ({
    subject: `You earned ₹${amount.toFixed(0)} commission! 💰`,
    html: wrap(`You earned ₹${amount.toFixed(0)}! 💰`,
      `<p>Hi ${name || 'there'}, someone enrolled in <strong>${courseTitle}</strong> using your referral.</p>
       <p>The amount will be available in your wallet after the standard hold period.</p>`,
      'View Wallet', `${SITE}/wallet`)
  }),
  refundProcessed: (name: string, amount: number, courseTitle: string, reason: string) => ({
    subject: `Refund processed: ₹${amount.toFixed(0)}`,
    html: wrap('Your refund has been processed',
      `<p>Hi ${name || 'there'}, a refund of <strong>₹${amount.toFixed(0)}</strong> for <strong>${courseTitle}</strong> has been initiated.</p>
       <p><strong>Reason:</strong> ${reason}</p>
       <p>It typically reflects in your account within 5–7 business days.</p>`)
  }),
  payoutApproved: (name: string, amount: number, utr: string) => ({
    subject: `Withdrawal of ₹${amount.toFixed(0)} processed ✅`,
    html: wrap('Your withdrawal is on the way 💸',
      `<p>Hi ${name || 'there'}, your withdrawal of <strong>₹${amount.toFixed(0)}</strong> has been processed.</p>
       <p><strong>UTR:</strong> ${utr}</p>
       <p>Allow up to 1 business day to reflect in your bank.</p>`,
      'View Wallet', `${SITE}/wallet`)
  }),
  payoutRejected: (name: string, amount: number, reason: string) => ({
    subject: `Withdrawal of ₹${amount.toFixed(0)} rejected`,
    html: wrap('Withdrawal request rejected',
      `<p>Hi ${name || 'there'}, your withdrawal of <strong>₹${amount.toFixed(0)}</strong> was rejected.</p>
       <p><strong>Reason:</strong> ${reason}</p>
       <p>The amount has been returned to your wallet balance.</p>`,
      'View Wallet', `${SITE}/wallet`)
  }),
  contactReceived: (name: string, subject: string) => ({
    subject: 'We received your message — Backupshala',
    html: wrap('Thanks for reaching out!',
      `<p>Hi ${name || 'there'}, we've received your message regarding "<strong>${subject}</strong>" and will respond within 24–48 hours.</p>`)
  }),
  contactAdminAlert: (name: string, email: string, subject: string, message: string) => ({
    subject: `[Contact] ${subject} — ${name}`,
    html: wrap('New contact form submission',
      `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
       <p><strong>Subject:</strong> ${subject}</p>
       <p><strong>Message:</strong></p>
       <p style="white-space:pre-wrap;background:#f1f5f9;padding:12px;border-radius:6px">${message.replace(/[<>]/g, c => ({ '<': '&lt;', '>': '&gt;' }[c]!))}</p>`)
  }),
};

export async function sendEmail(supabase: any, to: string | string[], tpl: { subject: string; html: string }) {
  try {
    await supabase.functions.invoke('send-email', { body: { to, ...tpl } });
  } catch (e) {
    console.error('sendEmail failed', e);
  }
}
