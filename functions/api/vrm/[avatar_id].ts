// めんどくさいので any で済ませる。VRoid API のレスポンスは型が緩いので、Env 以外は any で十分。 --- IGNORE ---
// It is troublesome, so I'll just use any. VRoid API responses are loosely typed. --- IGNORE ---

interface Env {
  VROID_APP_ID: string;
  VROID_CLIENT_SECRET: string;
  VROID_REFRESH_TOKEN: string; // 初回セットアップ時の初期値。以後は KV が優先される
  TOKEN_STORE?: KVNamespace;
}

const KV_REFRESH_TOKEN_KEY = 'vroid_refresh_token';
const USER_AGENT = 'VRoid Fetcher/1.0 (https://v.logue.dev)';

const toErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return '[unserializable error]';
  }
};

const parseCloudflareBlock = (body: string): { blocked: boolean; rayId?: string } => {
  const blocked =
    body.includes('Attention Required! | Cloudflare') ||
    body.includes('Sorry, you have been blocked');
  if (!blocked) {
    return { blocked: false };
  }
  const rayRegex = /Cloudflare Ray ID:\s*<strong[^>]*>([^<]+)<\/strong>/i;
  const rayMatch = rayRegex.exec(body);
  return { blocked: true, rayId: rayMatch?.[1] };
};

const readJsonSafely = async (res: Response) => {
  const body = await res.text();
  const contentType = res.headers.get('Content-Type') ?? '';
  const isJsonLike = contentType.toLowerCase().includes('application/json');
  const cloudflareBlock = parseCloudflareBlock(body);

  if (!isJsonLike) {
    return {
      ok: false as const,
      body,
      contentType,
      cloudflareBlock
    };
  }

  try {
    return {
      ok: true as const,
      body,
      contentType,
      cloudflareBlock,
      data: JSON.parse(body)
    };
  } catch (err) {
    return {
      ok: false as const,
      body,
      contentType,
      cloudflareBlock,
      parseError: toErrorMessage(err)
    };
  }
};

/**
 * VRoid Hub API を呼び出して、avatar_id に対応するキャラクターモデルの VRM ダウンロードURLを返す。
 * 1. KV に保存された refresh_token（なければ env var）で access_token を取得
 * 2. ログインユーザーのキャラクターモデル一覧を取得し、avatarId に対応するモデルIDを得る
 * 3. ダウンロードライセンスを発行 (character_model_id = characterModelId)
 * 4. ダウンロードライセンスから S3 presigned URL を取得 (302 リダイレクト)
 * 5. フロント(Vue)に S3 presigned URL を返す。（現在は未使用）
 *
 * Note: VRoid Hub API uses a token rotation mechanism, so the refresh token is updated with each use. The new refresh token is stored in KV for subsequent requests.
 *
 * @param context
 * @returns
 */
export const onRequest: PagesFunction<Env> = async context => {
  const { env } = context;

  // Path Parameter から avatar_id を取得
  const avatarId = context.params.avatar_id as string;

  // ホワイトリスト：ディレクトリトラバーサル防止。英数字、ハイフン、アンダースコアのみ許可。 --- IGNORE ---
  // Allowlist: Prevent directory traversal. Only alphanumeric, hyphens, and underscores allowed. --- IGNORE ---
  if (!/^[a-zA-Z0-9_-]+$/.test(avatarId)) {
    return new Response(JSON.stringify({ error: '❌ Invalid avatar_id format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // KV に保存済みのリフレッシュトークンを優先し、なければ env var を使用
  const storedRefreshToken = await env.TOKEN_STORE?.get(KV_REFRESH_TOKEN_KEY);
  const refreshToken = storedRefreshToken ?? env.VROID_REFRESH_TOKEN;

  if (!refreshToken) {
    return new Response(
      JSON.stringify({ error: '❌ VROID_REFRESH_TOKEN is not set. Visit /api/auth to authorize.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /** 汎用ヘッダ */
  const apiHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'User-Agent': USER_AGENT,
    'X-Api-Version': '11'
  });

  // 1. refresh_token で access_token を取得
  // VRoid Hub はローテーション方式のため、レスポンスの新しい refresh_token を KV に保存する
  let tokenRes: Response;
  try {
    tokenRes = await fetch('https://hub.vroid.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Api-Version': '11',
        'User-Agent': USER_AGENT
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: env.VROID_APP_ID,
        client_secret: env.VROID_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: '❌ Token refresh request failed',
        detail: toErrorMessage(err)
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const tokenParsed = await readJsonSafely(tokenRes);
  /*
  console.debug('[api/vrm] token refresh full response:', {
    status: tokenRes.status,
    ok: tokenRes.ok,
    contentType: tokenParsed.contentType,
    body: tokenParsed.body
  });
  */

  if (!tokenRes.ok) {
    if (tokenParsed.cloudflareBlock.blocked) {
      return new Response(
        JSON.stringify({
          error: '❌ Token refresh blocked by Cloudflare on VRoid side',
          rayId: tokenParsed.cloudflareBlock.rayId ?? 'unknown'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: '❌ Token refresh failed',
        detail: {
          status: tokenRes.status,
          contentType: tokenParsed.contentType,
          body: tokenParsed.body
        }
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  if (!tokenParsed.ok) {
    return new Response(
      JSON.stringify({
        error: '❌ Token refresh returned invalid JSON',
        detail: {
          contentType: tokenParsed.contentType,
          body: tokenParsed.body,
          parseError: tokenParsed.parseError
        }
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- VRoid API response is loosely typed
  const tokenData: any = tokenParsed.data;

  if (!tokenData.access_token) {
    console.error('Token refresh failed:', JSON.stringify(tokenData));
    return new Response(JSON.stringify({ error: '❌ Token refresh failed', detail: tokenData }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 新しい refresh_token が返ってきた場合は KV に保存（トークンローテーション対応）
  if (tokenData.refresh_token && env.TOKEN_STORE) {
    await env.TOKEN_STORE.put(KV_REFRESH_TOKEN_KEY, tokenData.refresh_token);
  }

  const accessToken: string = tokenData.access_token;

  // 2. ログインユーザーのキャラクターモデル一覧を取得し、avatarId に対応するモデルIDを得る
  // /api/characters/{id} はキャラクター情報のみで character_model_id を含まないため、
  // /api/account/character_models を使って character.id で絞り込む
  const accountModelsRes = await fetch('https://hub.vroid.com/api/account/character_models', {
    headers: apiHeaders(accessToken)
  });
  const accountModelsParsed = await readJsonSafely(accountModelsRes);
  if (!accountModelsParsed.ok) {
    return new Response(
      JSON.stringify({
        error: '❌ Failed to fetch account character models',
        detail: {
          status: accountModelsRes.status,
          contentType: accountModelsParsed.contentType,
          body: accountModelsParsed.body,
          parseError: accountModelsParsed.parseError
        }
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- VRoid API response is loosely typed
  const accountModelsData: any = accountModelsParsed.data;
  // console.info('Account models:', JSON.stringify(accountModelsData));

  // character.id が avatarId と一致するモデルを探す
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- API response uses generic any
  const models: any[] = accountModelsData?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- callback parameter must match array element type
  const matchedModel = models.find((m: any) => m?.character?.id === avatarId) ?? models[0];
  const characterModelId: string | undefined = matchedModel?.id;

  if (!characterModelId) {
    console.error('Failed to find character model:', JSON.stringify(accountModelsData));
    return new Response(
      JSON.stringify({
        error: '❌ Failed to find character model',
        detail: accountModelsData
      }),
      { status: accountModelsRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. ダウンロードライセンスを発行 (character_model_id = characterModelId)
  const licenseRes = await fetch('https://hub.vroid.com/api/download_licenses', {
    method: 'POST',
    headers: {
      ...apiHeaders(accessToken),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ character_model_id: characterModelId })
  });
  const licenseParsed = await readJsonSafely(licenseRes);
  if (!licenseParsed.ok) {
    return new Response(
      JSON.stringify({
        error: '❌ Failed to issue download license',
        detail: {
          status: licenseRes.status,
          contentType: licenseParsed.contentType,
          body: licenseParsed.body,
          parseError: licenseParsed.parseError
        }
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- VRoid API response is loosely typed
  const licenseData: any = licenseParsed.data;
  const licenseId: string | undefined = licenseData?.data?.id;

  if (!licenseId) {
    console.error('Download license issue failed:', JSON.stringify(licenseData));
    return new Response(
      JSON.stringify({ error: '❌️ Failed to issue download license', detail: licenseData }),
      { status: licenseRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. ダウンロードライセンスから S3 presigned URL を取得 (302 リダイレクト)
  const downloadRes = await fetch(
    `https://hub.vroid.com/api/download_licenses/${licenseId}/download`,
    { headers: apiHeaders(accessToken), redirect: 'manual' }
  );
  const vrmUrl = downloadRes.headers.get('Location');

  if (!vrmUrl) {
    console.error('Download redirect missing, status:', downloadRes.status);
    return new Response(
      JSON.stringify({ error: '❌ Failed to get VRM download URL', status: downloadRes.status }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 5. フロント(Vue)に S3 presigned URL を返す
  return new Response(JSON.stringify({ url: vrmUrl }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

// 君に対しては誠実になろう：ここには VRM ファイルにアクセスするためのコードがあった。
// しかし、私は正直者なので、ライセンス上問題になりそうな VRM ファイルをこのリポジトリやアセットサーバーから抹消し、
// VRoid Hub API から VRM データを取得する実装に変更した。 --- IGNORE ---
// 真実とは、時に痛みを伴うものでもあるのさ。 --- IGNORE ---

// I'll be honest with you： There used to be code here that directly accessed the VRM file.
// However, since I'm an honest person, I removed the VRM file that could potentially cause licensing issues from this repository and asset server,
// and changed the implementation to call the VRoid Hub API to fetch the VRM data.
// Sometimes the truth hurts. --- IGNORE ---

// logue.remote.out
