import { google } from "googleapis";

interface TokenRow {
  google_access_token: string | null;
  google_refresh_token: string | null;
  token_expiry: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getGoogleAccessToken(
  supabase: any,
  userId: string,
  sessionProviderToken?: string | null
): Promise<{ token: string | null; reauth_needed: boolean }> {
  if (sessionProviderToken) {
    return { token: sessionProviderToken, reauth_needed: false };
  }

  const { data } = await supabase
    .from("user_tokens")
    .select("google_access_token, google_refresh_token, token_expiry")
    .eq("user_id", userId)
    .single() as { data: TokenRow | null; error: unknown };

  if (!data) {
    return { token: null, reauth_needed: true };
  }

  const isExpired =
    !data.token_expiry ||
    new Date(data.token_expiry) < new Date(Date.now() + 60_000);

  if (!isExpired && data.google_access_token) {
    return { token: data.google_access_token, reauth_needed: false };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !data.google_refresh_token) {
    return {
      token: data.google_access_token ?? null,
      reauth_needed: !data.google_access_token,
    };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: data.google_refresh_token });

    const { credentials } = await oauth2Client.refreshAccessToken();
    const newExpiry = credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : new Date(Date.now() + 3_600_000).toISOString();

    await supabase
      .from("user_tokens")
      .update({
        google_access_token: credentials.access_token,
        token_expiry: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return { token: credentials.access_token ?? null, reauth_needed: false };
  } catch (e) {
    console.error("[google-tokens] refresh failed:", e);
    return { token: null, reauth_needed: true };
  }
}
