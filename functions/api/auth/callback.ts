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

  const tokenRes = await fetch('https://hub.vroid.com/oauth/token', {
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

  const tokenData: VroidTokenResponse = await tokenRes.json();

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VRoid Hub API Auth Setup</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
</head>
<body>
  <main class="container">
  <h1>✅ Authorization successful</h1>
  <p>The refresh_token has been saved to the KV store. Tokens will be rotated automatically from now on.</p>
  <p>For the first time only, also set the value below as <code>VROID_REFRESH_TOKEN</code> in <code>.dev.vars</code> (used as a fallback when KV is empty).</p>
  <h2><label for="refresh_token">VROID_REFRESH_TOKEN</label></h2>
  <textarea id="refresh_token" class="form-control" rows="3" readonly>${tokenData.refresh_token}</textarea>
  <details><summary>Full response</summary><pre>${JSON.stringify(tokenData, null, 2)}</pre></details>
  </main>
  </body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
};

// さて、ここに書かれている HTML が無事表示できた人間はどれくらいいるかな？ --- IGNORE ---
// 💡ヒント：Vroid Hub のコールバック URL はこの API のエンドポイントを指している必要があるぞ。 --- IGNORE ---

// Now, how many of you were able to successfully display the HTML written here? --- IGNORE ---
// 💡Hint: The Vroid Hub callback URL needs to point to this API endpoint. --- IGNORE ---
