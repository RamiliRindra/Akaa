const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

const bootstrapAdminEmails = [
  "rindra@nexthope.net",
  ...(process.env.BOOTSTRAP_ADMIN_EMAILS?.split(",") ?? []),
]
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const hasGoogleOAuth =
  Boolean(googleClientId && googleClientSecret) &&
  !googleClientId?.includes("replace-with") &&
  !googleClientSecret?.includes("replace-with");

export function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return bootstrapAdminEmails.includes(email.trim().toLowerCase());
}

export function getGoogleOAuthConfig() {
  return {
    clientId: googleClientId,
    clientSecret: googleClientSecret,
  };
}
