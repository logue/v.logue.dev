interface Env {
  VROID_APP_ID: string;
  VROID_CLIENT_SECRET: string;
  TOKEN_STORE?: KVNamespace;
}

interface VroidTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token: string;
  created_at: number;
}

const toErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  return String(err);
};

const parseCloudflareBlock = (body: string): { blocked: boolean; rayId?: string } => {
  const blocked =
    body.includes('Attention Required! | Cloudflare') ||
    body.includes('Sorry, you have been blocked');
  if (!blocked) {
    return { blocked: false };
  }
  const rayMatch = body.match(/Cloudflare Ray ID:\s*<strong[^>]*>([^<]+)<\/strong>/i);
  return { blocked: true, rayId: rayMatch?.[1] };
};

/**
 * GET /api/auth/callback
 * VRoid Hub から認可コードを受け取り、アクセストークンとリフレッシュトークンに交換する。
 * 取得した refresh_token を .dev.vars や環境変数の VROID_REFRESH_TOKEN に手動で設定する。
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const { env, request } = context;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(`❌ Authorization failed: ${error}`, {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  if (!code) {
    return new Response('❌ Missing authorization code.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  // cookie から code_verifier と state を取得して検証
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const getCookie = (name: string) =>
    cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1];

  const savedState = getCookie('vroid_state');
  const codeVerifier = getCookie('vroid_cv');

  const returnedState = url.searchParams.get('state');
  if (!savedState || savedState !== returnedState) {
    return new Response('❌ State mismatch. Possible CSRF attack or session expired.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
  if (!codeVerifier) {
    return new Response('❌ Missing code_verifier cookie. Please restart the auth flow.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  // redirect_uri は認可リクエスト時と同じ値 (origin から動的生成) を使う
  const redirectUri = `${new URL(request.url).origin}/api/auth/callback`;

  let tokenRes: Response;
  try {
    tokenRes = await fetch('https://hub.vroid.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Api-Version': '11'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.VROID_APP_ID,
        client_secret: env.VROID_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      })
    });
  } catch (err) {
    return new Response(`❌ Token exchange request failed:\n${toErrorMessage(err)}`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const rawTokenBody = await tokenRes.text();
  const contentType = tokenRes.headers.get('Content-Type') ?? '';
  const isJsonLike = contentType.toLowerCase().includes('application/json');
  const cloudflareBlock = parseCloudflareBlock(rawTokenBody);

  console.log('[auth/callback] token exchange full response:', {
    status: tokenRes.status,
    ok: tokenRes.ok,
    contentType,
    body: rawTokenBody
  });

  if (!tokenRes.ok) {
    if (cloudflareBlock.blocked) {
      return new Response(
        `❌ Token exchange blocked by Cloudflare on VRoid side.\nRay ID: ${cloudflareBlock.rayId ?? 'unknown'}\nPlease contact VRoid support and provide the Ray ID for allowlisting/inspection.`,
        {
          status: 502,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }

    return new Response(
      `❌ Token exchange failed with upstream status ${tokenRes.status}.\nContent-Type: ${contentType}\nBody:\n${rawTokenBody}`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }

  if (!isJsonLike) {
    if (cloudflareBlock.blocked) {
      return new Response(
        `❌ Token exchange blocked by Cloudflare on VRoid side.\nRay ID: ${cloudflareBlock.rayId ?? 'unknown'}\nPlease contact VRoid support and provide the Ray ID for allowlisting/inspection.`,
        {
          status: 502,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }

    return new Response(
      `❌ Token exchange returned non-JSON response.\nContent-Type: ${contentType}\nBody:\n${rawTokenBody}`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }

  let tokenData: VroidTokenResponse;
  try {
    tokenData = JSON.parse(rawTokenBody) as VroidTokenResponse;
  } catch (err) {
    return new Response(
      `❌ Token exchange JSON parse failed: ${toErrorMessage(err)}\nBody:\n${rawTokenBody}`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }

  if (!tokenData.refresh_token) {
    return new Response(`❌ Token exchange failed:\n${JSON.stringify(tokenData, null, 2)}`, {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  // KV にリフレッシュトークンを保存（以降の自動ローテーションに使用）
  if (env.TOKEN_STORE) {
    await env.TOKEN_STORE.put('vroid_refresh_token', tokenData.refresh_token);
  }

  console.log('[auth/callback] refresh token stored successfully.');

  const successText =
    '✅ Authorization successful.\n' +
    'The refresh_token has been saved to the KV store.\n\n' +
    `VROID_REFRESH_TOKEN=${tokenData.refresh_token}`;

  return new Response(successText, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
};

// さて、ここに書かれているテキストが無事表示できた人間はどれくらいいるかな？ --- IGNORE ---
// 💡ヒント：Vroid Hub のコールバック URL はこの API のエンドポイントを指している必要があるぞ。 --- IGNORE ---

// Now, how many of you were able to successfully display the Text written here? --- IGNORE ---
// 💡Hint: The Vroid Hub callback URL needs to point to this API endpoint. --- IGNORE ---
