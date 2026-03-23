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
<html lang="ja">
<head><meta charset="UTF-8"><title>VRoid Auth Setup</title></head>
<body style="font-family:monospace;padding:2rem;max-width:800px">
  <h2>認証成功 ✅</h2>
  <p>refresh_token を KV ストアに保存しました。以降は自動でトークンがローテーションされます。</p>
  <p>初回のみ、以下の値を <code>.dev.vars</code> の <strong>VROID_REFRESH_TOKEN</strong> にも設定してください（KV が空の場合のフォールバック用）。</p>
  <h3>refresh_token</h3>
  <textarea rows="3" style="width:100%;font-size:0.85em">${tokenData.refresh_token}</textarea>
  <details><summary>フルレスポンス</summary><pre>${JSON.stringify(tokenData, null, 2)}</pre></details>
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
