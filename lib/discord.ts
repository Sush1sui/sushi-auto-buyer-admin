const DISCORD_API_ENDPOINT = 'https://discord.com/api/v10';

export function getDiscordOAuthUrl(state?: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID || '';
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || '');
  const scope = encodeURIComponent('identify guilds guilds.members.read');
  let url = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  if (state) {
    url += `&state=${encodeURIComponent(state)}`;
  }
  return url;
}

export async function exchangeCodeForToken(code: string): Promise<{ access_token: string; token_type: string } | null> {
  const clientId = process.env.DISCORD_CLIENT_ID || '';
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
  const redirectUri = process.env.DISCORD_REDIRECT_URI || '';

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${DISCORD_API_ENDPOINT}/oauth2/token`, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Discord OAuth] Token exchange error:', errorText);
    return null;
  }

  return response.json();
}

export async function fetchDiscordUser(accessToken: string): Promise<{ id: string; username: string; avatar: string | null } | null> {
  const response = await fetch(`${DISCORD_API_ENDPOINT}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function fetchUserGuilds(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await fetch(`${DISCORD_API_ENDPOINT}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export async function fetchGuildMember(accessToken: string, guildId: string): Promise<{ roles: string[] } | null> {
  try {
    const response = await fetch(`${DISCORD_API_ENDPOINT}/users/@me/guilds/${guildId}/member`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
