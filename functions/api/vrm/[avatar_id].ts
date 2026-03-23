/* eslint-disable @typescript-eslint/no-explicit-any */
interface Env {
  VROID_CLIENT_ID: string;
  VROID_CLIENT_SECRET: string;
  VROID_REFRESH_TOKEN: string; // 初回セットアップ時の初期値。以後は KV が優先される
  TOKEN_STORE?: KVNamespace;
}

const KV_REFRESH_TOKEN_KEY = 'vroid_refresh_token';

export const onRequest: PagesFunction<Env> = async context => {
  const { env } = context;

  // Path Parameter から avatar_id を取得
  const avatarId = context.params.avatar_id as string;

  // KV に保存済みのリフレッシュトークンを優先し、なければ env var を使用
  const storedRefreshToken = await env.TOKEN_STORE?.get(KV_REFRESH_TOKEN_KEY);
  const refreshToken = storedRefreshToken ?? env.VROID_REFRESH_TOKEN;

  if (!refreshToken) {
    return new Response(
      JSON.stringify({ error: 'VROID_REFRESH_TOKEN is not set. Visit /api/auth to authorize.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'X-Api-Version': '11'
  });

  // 1. refresh_token で access_token を取得
  // VRoid Hub はローテーション方式のため、レスポンスの新しい refresh_token を KV に保存する
  const tokenRes = await fetch('https://hub.vroid.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Api-Version': '11' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.VROID_CLIENT_ID,
      client_secret: env.VROID_CLIENT_SECRET,
      refresh_token: refreshToken
    })
  });
  const tokenData: any = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error('Token refresh failed:', JSON.stringify(tokenData));
    return new Response(JSON.stringify({ error: 'Token refresh failed', detail: tokenData }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 新しい refresh_token が返ってきた場合は KV に保存（トークンローテーション対応）
  if (tokenData.refresh_token && env.TOKEN_STORE) {
    await env.TOKEN_STORE.put(KV_REFRESH_TOKEN_KEY, tokenData.refresh_token);
  }

  const accessToken: string = tokenData.access_token;

  // 2. ダウンロードライセンスを発行 (character_model_id = avatarId)
  const licenseRes = await fetch('https://hub.vroid.com/api/download_licenses', {
    method: 'POST',
    headers: { ...apiHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ character_model_id: avatarId })
  });
  const licenseData: any = await licenseRes.json();
  const licenseId: string | undefined = licenseData?.data?.id;

  if (!licenseId) {
    console.error('Download license issue failed:', JSON.stringify(licenseData));
    return new Response(
      JSON.stringify({ error: 'Failed to issue download license', detail: licenseData }),
      { status: licenseRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. ダウンロードライセンスから S3 presigned URL を取得 (302 リダイレクト)
  const downloadRes = await fetch(
    `https://hub.vroid.com/api/download_licenses/${licenseId}/download`,
    { headers: apiHeaders(accessToken), redirect: 'manual' }
  );
  const vrmUrl = downloadRes.headers.get('Location');

  if (!vrmUrl) {
    console.error('Download redirect missing, status:', downloadRes.status);
    return new Response(
      JSON.stringify({ error: 'Failed to get VRM download URL', status: downloadRes.status }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. フロント(Vue)に S3 presigned URL を返す
  return new Response(JSON.stringify({ url: vrmUrl }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

// 君に対しては誠実になろう：ここには VRM ファイルにアクセスするためのコードがあった。
// しかし、私は正直者なので、VRM ファイルを抹消し、VRoid Hub API を呼び出してデータを取得する実装に変更した。 --- IGNORE ---
// 時々良心が痛むよ。 --- IGNORE ---

// I'll be honest with you: There used to be code here that directly accessed the VRM file.
// But since I'm being honest, I refactored it to call the VRoid Hub API to fetch the data instead of directly accessing the VRM file. --- IGNORE ---
// Sometimes the truth hurts. --- IGNORE ---

// logue.remote.out
