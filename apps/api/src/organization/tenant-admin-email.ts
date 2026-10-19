interface TenantAdminEmail {
  kind: 'welcome' | 'reset';
  organizationName: string;
  adminFullName: string;
  adminEmail: string;
  workspaceUrl: string;
  adminPassword?: string;
  isTrial?: boolean;
  paymentLinkUrl?: string | null;
}

export function buildTenantAdminEmail(options: TenantAdminEmail) {
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character] || character,
    );
  const loginUrl = `${options.workspaceUrl}/login`;
  const subject =
    options.kind === 'welcome'
      ? `Welcome to Gromoze — ${options.organizationName}`
      : `Gromoze administrator credentials updated — ${options.organizationName}`;
  const status =
    options.kind === 'reset'
      ? 'Your administrator password has been updated.'
      : options.isTrial
      ? 'Your 14-day trial is ready. You can sign in now.'
      : 'Your workspace has been created. Setup payment is required to activate CRM access.';
  const password = options.adminPassword
    ? `Password: ${options.adminPassword}`
    : 'Use your existing password. If you have forgotten it, ask your platform administrator to reset it.';
  const text = `Hello ${options.adminFullName},\n\n${status}\n\nWorkspace: ${
    options.organizationName
  }\nLogin: ${loginUrl}\nEmail: ${options.adminEmail}\n${password}${
    options.paymentLinkUrl ? `\nSetup payment: ${options.paymentLinkUrl}` : ''
  }\n\nKeep your credentials confidential.\nGromoze`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0B335B;line-height:1.6">
    <h1>${
      options.kind === 'welcome'
        ? 'Welcome to Gromoze'
        : 'Administrator credentials updated'
    }</h1>
    <p>Hello ${escape(options.adminFullName)},</p><p>${status}</p>
    <h2>${escape(options.organizationName)}</h2>
    <p>Login email: <strong>${escape(options.adminEmail)}</strong></p>
    <p>${escape(password)}</p>
    <p><a style="color:#007C7B" href="${escape(
      loginUrl,
    )}">Open your workspace</a><br>${escape(loginUrl)}</p>
    ${
      options.paymentLinkUrl
        ? `<p><a style="color:#007C7B" href="${escape(
            options.paymentLinkUrl,
          )}">Complete setup payment</a></p>`
        : ''
    }
    <p>Keep your credentials confidential.</p><p>Gromoze · Real Estate Sales. Simplified.</p>
  </div>`;
  return { subject, text, html };
}
