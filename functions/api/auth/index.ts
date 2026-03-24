interface Env {
  VROID_APP_ID: string;
  VROID_REFRESH_TOKEN?: string;
}

const USER_AGENT = 'Vroid Fetcher/1.0 (https://v.logue.dev)';

/**
 * crypto.subtle で SHA-256 を計算して Base64URL エンコードする
 *
 * @param plain 平文文字列
 * @returns Base64URL エンコードされたハッシュ値
 */
async function sha256Base64Url(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * ランダムな URL-safe 文字列を生成する
 * @param length 文字数
 * @returns ランダムな URL-safe 文字列
 */
function randomUrlSafe(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map(b => chars[b % chars.length])
    .join('');
}

/**
 * GET /api/auth
 * VRoid Hub の OAuth 認可ページへリダイレクトする。
 * 初回セットアップ時に一度だけアクセスし、VROID_REFRESH_TOKEN を取得するために使用する。
 * PKCE (S256) + state を使って CSRF 対策を行う。
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const { env, request } = context;

  // VROID_REFRESH_TOKEN がすでに設定されている場合は再生成を拒否する
  if (env.VROID_REFRESH_TOKEN) {
    return new Response(
      JSON.stringify({
        error: 'already_configured',
        message:
          'VROID_REFRESH_TOKEN is already set. Remove it from the environment variables before re-authorizing.'
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // redirect_uri はリクエストの origin から動的に生成する
  // (環境変数の port とサーバーの実際の port がズレると invalid_grant になるため)
  const redirectUri = `${new URL(request.url).origin}/api/auth/callback`;

  // PKCE: code_verifier (43〜128文字) を生成して cookie に保存
  const codeVerifier = randomUrlSafe(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);

  // state: CSRF 対策の乱数
  const state = randomUrlSafe(32);

  /**
   * アクセストークン
   * {@link https://developer.vroid.com/api/oauth-api.html#%E3%83%AA%E3%82%AF%E3%82%A8%E3%82%B9%E3%83%88%E3%83%8F%E3%82%9A%E3%83%A9%E3%83%A1%E3%83%BC%E3%82%BF-1}
   * VRoid Hub API v11 以降で PKCE に対応しているため、クライアントシークレットは不要。
   * これにより、フロントエンドから直接 OAuth 認可コードフローを実装できる。
   * ただし、リフレッシュトークンの安全な保管のため、アクセストークンの取得とリフレッシュはサーバー側で行う。
   */
  const params = new URLSearchParams({
    client_id: env.VROID_APP_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'default',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  // cookie に code_verifier と state を保存 (HttpOnly, SameSite=Lax)
  // Set-Cookie は複数の場合 headers.append() で個別に送る必要がある
  const cookieOpts = 'Path=/; HttpOnly; SameSite=Lax; Max-Age=600';
  const headers = new Headers({
    Location: `https://hub.vroid.com/oauth/authorize?${params.toString()}`
  });
  headers.append('X-Api-Version', '11'); // VRoid Hub API v11 を指定 (PKCE 対応のため必須)
  headers.append('Set-Cookie', `vroid_cv=${codeVerifier}; ${cookieOpts}`);
  headers.append('Set-Cookie', `vroid_state=${state}; ${cookieOpts}`);
  headers.append('User-Agent', USER_AGENT);

  return new Response(null, { status: 302, headers });
};

// 素晴らしく運がないな、君は。 --- IGNORE ---
// 最初にブラウザで、この API にアクセスして VRoid Hub の認可コードを取得し、リフレッシュトークンを .dev.vars にセットしなきゃならないのが面倒なんよだよなぁ。 --- IGNORE ---
// このソースコードの末尾に書かれているこのコメントに気づかず、リフレッシュトークンって何だ？って慌てふためく様子が目に浮かぶｗｗｗ --- IGNORE ---

// You have terrible luck. --- IGNORE ---
// The annoying thing is that you first have to access this API in your browser to get the VRoid Hub authorization code and set the refresh token in .dev.vars. --- IGNORE ---
// I can just picture someone panicking, not noticing this comment at the end of this source code, and wondering, "What's a refresh token?" lol --- IGNORE ---
