import nodemailer, { type Transporter } from 'nodemailer'

let transporter: Transporter | undefined

// SMTP transport — defaults to Mailpit's local listener (127.0.0.1:1025, no auth)
// so invite/reset emails can be previewed at http://localhost:8025 in development.
// Point SMTP_HOST/SMTP_PORT (and SMTP_USER/SMTP_PASS if the server requires auth)
// at a real mail server for production delivery.
function getTransporter(): Transporter {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST ?? '127.0.0.1'
  const port = Number(process.env.SMTP_PORT ?? 1025)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: user && pass ? { user, pass } : undefined,
  })
  return transporter
}

function getFrom(): string {
  return process.env.EMAIL_FROM ?? 'NEW SZN <invites@new-szn.local>'
}

export async function sendInviteEmail(to: string, inviteUrl: string): Promise<void> {
  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: "You're invited to NEW SZN",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#111;margin-bottom:12px;">You're invited to NEW SZN</h2>
        <p style="color:#555;margin-bottom:24px;">
          You've been invited to access the NEW SZN performance dashboard.
          Click the button below to set your password and activate your account.
        </p>
        <a href="${inviteUrl}"
           style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:500;">
          Accept invitation
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px;">
          This link expires in 48 hours. If you didn't expect this email, you can ignore it.
        </p>
      </div>
    `,
  })
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await getTransporter().sendMail({
    from: getFrom(),
    to,
    subject: 'Reset your NEW SZN password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#111;margin-bottom:12px;">Reset your password</h2>
        <p style="color:#555;margin-bottom:24px;">
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:500;">
          Reset password
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px;">
          This link expires in 1 hour. If you didn't request this, you can ignore it.
        </p>
      </div>
    `,
  })
}
