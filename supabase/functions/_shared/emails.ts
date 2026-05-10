// Shared email templates for Backupshala edge functions
const BRAND = '#16a34a';
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
  enrollmentConfirmed: (name: string, courseTitle: string) => ({
    subject: `Enrollment confirmed: ${courseTitle} ✅`,
    html: wrap('You\'re enrolled! 🎓',
      `<p>Hi ${name || 'there'}, your enrollment in <strong>${courseTitle}</strong> is confirmed.</p>
       <p>Your invoice is in your dashboard.</p>`,
      'Start Learning', `${SITE}/dashboard`)
  }),
  commissionEarned: (name: string, amount: number, courseTitle: string) => ({
    subject: `You earned ₹${amount.toFixed(0)} commission! 💰`,
    html: wrap(`You earned ₹${amount.toFixed(0)}! 💰`,
      `<p>Hi ${name || 'there'}, someone enrolled in <strong>${courseTitle}</strong> using your referral.</p>
       <p>The amount is in your wallet (subject to hold period).</p>`,
      'View Wallet', `${SITE}/wallet`)
  }),
  refundProcessed: (name: string, amount: number, courseTitle: string, reason: string) => ({
    subject: `Refund processed: ₹${amount.toFixed(0)}`,
    html: wrap('Your refund has been processed',
      `<p>Hi ${name || 'there'}, a refund of <strong>₹${amount.toFixed(0)}</strong> for <strong>${courseTitle}</strong> has been initiated.</p>
       <p><strong>Reason:</strong> ${reason}</p>
       <p>It typically reflects within 5–7 business days.</p>`)
  }),
  payoutApproved: (name: string, amount: number, method: string) => ({
    subject: `Payout approved: ₹${amount.toFixed(0)} ✅`,
    html: wrap('Your payout has been approved',
      `<p>Hi ${name || 'there'}, your payout request of <strong>₹${amount.toFixed(0)}</strong> via <strong>${method}</strong> has been approved.</p>
       <p>It typically reflects in your account within 1–3 business days.</p>`,
      'View Wallet', `${SITE}/wallet`)
  }),
  payoutRejected: (name: string, amount: number, reason: string) => ({
    subject: `Payout request needs attention`,
    html: wrap('Payout could not be processed',
      `<p>Hi ${name || 'there'}, your payout request of <strong>₹${amount.toFixed(0)}</strong> could not be processed.</p>
       <p><strong>Reason:</strong> ${reason}</p>
       <p>The amount remains in your wallet. Please update your details and try again.</p>`,
      'View Wallet', `${SITE}/wallet`)
  }),
  mentorUnlockApproved: (name: string, courseTitle: string, moduleTitle: string) => ({
    subject: `Module unlocked: ${moduleTitle} 🔓`,
    html: wrap('Your mentor has unlocked the next module',
      `<p>Hi ${name || 'there'}, your mentor has approved your unlock request for <strong>${moduleTitle}</strong> in <strong>${courseTitle}</strong>.</p>
       <p>You can continue learning right away.</p>`,
      'Continue Learning', `${SITE}/dashboard`)
  }),
  certificateIssued: (name: string, courseTitle: string, certCode: string) => ({
    subject: `Congratulations! Your certificate is ready 🏆`,
    html: wrap('You completed the course! 🏆',
      `<p>Hi ${name || 'there'}, you've successfully completed <strong>${courseTitle}</strong>.</p>
       <p>Your certificate code: <strong style="font-family:monospace">${certCode}</strong></p>`,
      'View Certificate', `${SITE}/certificate/${certCode}`)
  }),
};

export async function sendEmail(supabase: any, to: string | string[], tpl: { subject: string; html: string }) {
  try {
    const { error } = await supabase.functions.invoke('send-email', { body: { to, ...tpl } });
    if (error) console.error('sendEmail error:', error);
  } catch (e) {
    console.error('sendEmail exception', e);
  }
}

// Log uncaught edge function errors to system_errors for admin visibility
export async function logSystemError(
  supabase: any,
  functionName: string,
  err: unknown,
  context: Record<string, unknown> = {},
  severity: 'error' | 'warning' | 'critical' = 'error',
) {
  try {
    const e = err as Error;
    await supabase.from('system_errors').insert({
      function_name: functionName,
      error_message: e?.message || String(err),
      error_stack: e?.stack || null,
      context,
      severity,
    });
  } catch (logErr) {
    console.error('logSystemError failed', logErr);
  }
}
