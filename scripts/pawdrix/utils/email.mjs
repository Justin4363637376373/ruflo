import nodemailer from 'nodemailer';

export async function sendReport(subject, html) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.REPORT_EMAIL || 'jh6979733@gmail.com';

  if (!user || !pass) {
    console.warn('⚠️  Email skipped — GMAIL_USER or GMAIL_APP_PASSWORD not set');
    console.log('\n--- EMAIL PREVIEW ---');
    console.log('Subject:', subject);
    return;
  }

  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  await transport.sendMail({
    from: `"🐾 Pawdrix CEO System" <${user}>`,
    to,
    subject,
    html,
  });

  console.log(`📧 Report sent to ${to}`);
}
