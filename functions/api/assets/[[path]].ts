/**
 * 許可するファイルのマッチパターン（スペース・括弧を含むファイル名にも対応）
 * Allowed file match pattern (supports filenames with spaces and parentheses)
 */
const ALLOWED_FILE_RE = /^[\w()\s-][\w()\s/.-]*\.(zip|ogg|mov|mp4|vrm)$/i;

interface Env {
  ASSET_HOST: string;
  // オプション: カンマ区切りで許可するオリジンを指定 (例: "http://localhost,https://example.com")
  // Optional: Specify allowed origins as a comma-separated list (e.g., "http://localhost,https://example.com")
  ALLOWED_ORIGINS?: string;
}

/**
 * 指定された Origin が許可されているか判定し、許可された origin を返す。許可されない場合は null を返す。
 * Determines if the specified Origin is allowed and returns the allowed origin. Returns null if not allowed.
 */
function resolveAllowedOrigin(
  requestOrigin: string | null,
  env: Env,
  pageOrigin: string
): string | null {
  // 1) リクエストに Origin が無ければ（同一オリジンで直接アクセスされる場合など） pageOrigin を使う
  // If the request does not have an Origin (e.g., direct access from the same origin), use pageOrigin as the allowed origin.
  if (!requestOrigin) {
    // 同一オリジンとして扱う（ブラウザからの通常リクエストは Origin を含めない場合がある）
    // Treat as same-origin (browsers may omit Origin for same-origin requests)
    return pageOrigin;
  }

  // 2) 環境変数 ALLOWED_ORIGINS が設定されている場合はそこから判定
  // If the ALLOWED_ORIGINS environment variable is set, use it to determine if the request origin is allowed. This allows for flexible configuration of allowed origins without changing the code. The variable should be a comma-separated list of origins, and we will check for an exact match against the request origin.
  const raw = env.ALLOWED_ORIGINS?.trim();
  if (raw && raw.length > 0) {
    const whitelist = raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    // 完全一致で許可（サブパスやワイルドカードは許容しない）
    // Allow only exact matches (no subpaths or wildcards)
    if (whitelist.includes(requestOrigin)) return requestOrigin;
    return null;
  }

  // 3) 環境変数が未設定ならデフォルトで同一オリジンのみ許可
  // If the environment variable is not set, only allow the same origin by default.
  if (requestOrigin === pageOrigin) return requestOrigin;
  return null;
}

/**
 * 共通で使う CORS ヘッダ作成
 * Create common CORS headers
 */
function makeCorsHeaders(allowedOrigin: string) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    // ブラウザ側キャッシュで別オリジンの結果が共有されないようにする
    // Prevent caching of responses across origins in browser caches
    Vary: 'Origin'
  } as Record<string, string>;
}

/**
 * 共通アセット配信
 * Worker で独立して動作し、Pages 側のプロキシ経由、
 * または許可されたドメインからの直接アクセスを処理する。
 *
 * Common asset delivery. Operates independently in the Worker, handling requests either through the Pages proxy or direct access from allowed domains. It validates the requested file path, checks CORS permissions, and fetches the asset from the configured ASSET_HOST, streaming it back to the client with appropriate headers.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const url = new URL(context.request.url);

  // Path Parameter からファイルパスを取得（catch-all は string | string[] になる）
  const pathParam = context.params.path;
  const rawFile = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;

  // URL エンコードされた状態で渡ってくる場合があるのでデコードする
  // Decode the file path, as it may be URL-encoded when received.
  let file: string;
  try {
    file = decodeURIComponent(rawFile);
  } catch {
    file = rawFile;
  }

  // 1. パラメータチェック（パストラバーサル対策 + 許可拡張子チェック）
  // Parameter check (prevent path traversal + allowed extension check)
  if (!file || file.includes('..') || !ALLOWED_FILE_RE.test(file)) {
    return new Response(JSON.stringify({ error: '❌️ Invalid file parameter', received: file }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // CORS 判定
  // This section determines if the request's Origin is allowed based on the environment configuration and the page's origin. It ensures that only requests from permitted origins can access the asset proxy, enhancing security while allowing flexibility in deployment scenarios.
  const requestOrigin = context.request.headers.get('Origin');
  // pageOrigin: この Pages の origin として扱う
  // pageOrigin: Treated as the origin of this Pages
  const pageOrigin = url.origin;
  const allowedOrigin = resolveAllowedOrigin(requestOrigin, context.env, pageOrigin);

  if (!allowedOrigin) {
    // 明示的にブロックする（既存実装とは異なりワイルドカード許可はしない）
    // Explicitly block (unlike the existing implementation, we do not allow wildcard)
    return new Response(
      JSON.stringify({ error: '❌️ CORS origin not allowed', origin: requestOrigin }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // 2. 外部アセット取得
  // Fetch external asset from the asset server. The asset server URL is constructed from the ASSET_HOST environment variable and the requested file path. We also include CORS headers and the Range header if present to support partial content retrieval.
  const assetUrl = `${context.env.ASSET_HOST.replace(/\/$/, '')}/${file}`;
  console.log(`Fetching asset from: ${assetUrl}`);

  // ブラウザの Referer を転送。なければ自ページの Origin を使用。
  // Set the Referer header to the browser's Referer or fallback to the page's Origin if Referer is not available. This can help with analytics and some server-side checks on the asset server.
  const fetchHeaders: Record<string, string> = {
    Referer: context.request.headers.get('Referer') ?? `${url.origin}/`,
    Origin: allowedOrigin
  };

  // Range ヘッダーを転送（worker 側の部分取得対応を活かす）
  // Add the Range header to the fetch request to utilize the worker's support for partial content retrieval. This allows for efficient streaming of large assets and supports features like seeking in media files.
  const range = context.request.headers.get('Range');
  if (range) fetchHeaders['Range'] = range;

  try {
    // アセットを取得
    // Fetch the asset
    const assetRes = await fetch(assetUrl, { headers: fetchHeaders });

    if (!assetRes.ok) {
      // upstream のステータスを透過するが、CORS ヘッダは付与しておく（キャッシュ対策のため Vary を付与）
      // This will pass through the upstream status, but we add CORS headers (including Vary for caching) to prevent caching of error responses across origins.
      const errorHeaders = { ...makeCorsHeaders(allowedOrigin) };
      return new Response(`❌️ Upstream error: ${assetRes.status}`, {
        status: assetRes.status,
        headers: errorHeaders
      });
    }

    // 3. レスポンスをストリーミング転送（バッファリング不要）
    // Streaming transfer without buffering is possible because we are not modifying the body, just passing it through with some header adjustments.
    const respHeaders: Record<string, string> = {
      'Content-Type': assetRes.headers.get('Content-Type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400',
      ...makeCorsHeaders(allowedOrigin)
    };
    for (const key of ['Content-Length', 'Content-Range', 'Accept-Ranges']) {
      const val = assetRes.headers.get(key);
      // eslint-disable-next-line security/detect-object-injection
      if (val) respHeaders[key] = val;
    }

    return new Response(assetRes.body, { status: assetRes.status, headers: respHeaders });
  } catch (e: unknown) {
    // 4. 実行時エラーの可視化
    // Visualize runtime errors. This catch block ensures that if there is an unexpected error during the fetch or response handling, we return a clear JSON response with the error message, and we also include CORS headers to ensure that the error response can be received by the client even in cross-origin scenarios.
    const message = e instanceof Error ? e.message : String(e);
    const errHeaders = {
      'Content-Type': 'application/json',
      ...(context.request.headers.get('Origin')
        ? makeCorsHeaders(context.request.headers.get('Origin')!)
        : {})
    };
    return new Response(JSON.stringify({ error: '❌️ Internal Worker Error', message }), {
      status: 500,
      headers: errHeaders
    });
  }
};

// OPTIONS (プリフライト) ハンドラを追加
// Add OPTIONS (preflight) handler
export const onRequestOptions: PagesFunction<Env> = async context => {
  const url = new URL(context.request.url);
  const requestOrigin = context.request.headers.get('Origin');
  const pageOrigin = url.origin;
  const allowedOrigin = resolveAllowedOrigin(requestOrigin, context.env, pageOrigin);

  if (!allowedOrigin) {
    return new Response(null, { status: 403 });
  }

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };

  return new Response(null, { status: 204, headers });
};

// まぁ、普通に考えてアセットサーバーの情報は .env に入れるべきだよね。 --- IGNORE ---
// 当然、ソースコードにそれらの情報は書かれていない。 --- IGNORE ---
// わかったら、env.d.ts はちゃんと書いておけよ。 --- IGNORE ---

// Well, logically speaking, asset server information should be put in the .env file, right? --- IGNORE ---
// Of course, that information is not written in the source code. --- IGNORE ---
// If you understand, make sure to write env.d.ts properly. --- IGNORE ---

// logue.remote.out
