/** 許可するファイルのマッチパターン */
const ALLOWED_FILE_RE = /^[\w-][\w/-]*\.(zip|ogg|mov)$/i;

interface Env {
  ASSET_HOST: string;
}

/**
 * 共通アセット配信
 * Worker で独立して動作し、Pages 側のプロキシ経由、
 * または許可されたドメインからの直接アクセスを処理する。
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const url = new URL(context.request.url);

  // Path Parameter からファイルパスを取得（catch-all は string | string[] になる）
  const pathParam = context.params.path;
  const file = Array.isArray(pathParam) ? pathParam.join('/') : pathParam;

  // 1. パラメータチェック
  if (!file || !ALLOWED_FILE_RE.test(file)) {
    return new Response(JSON.stringify({ error: 'Invalid file parameter', received: file }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 2. 外部アセット取得
    const assetUrl = `${context.env.ASSET_HOST}/${file}`;
    console.log(`Fetching asset from: ${assetUrl}`);
    // ブラウザの Referer を転送。なければ自ページの Origin を使用。
    // worker 側の許可チェック（Referer/Origin ヘッダーで実行元のドメインが含まれているか判定）に通すため、
    // url.origin だけでなく Origin ヘッダーも明示的に送る。
    const fetchHeaders: Record<string, string> = {
      Referer: context.request.headers.get('Referer') ?? `${url.origin}/`,
      Origin: url.origin
    };

    // Range ヘッダーを転送（worker 側の部分取得対応を活かす）
    const range = context.request.headers.get('Range');
    if (range) fetchHeaders['Range'] = range;

    // アセットを取得
    const assetRes = await fetch(assetUrl, { headers: fetchHeaders });

    if (!assetRes.ok) {
      return new Response(`Upstream error: ${assetRes.status}`, { status: assetRes.status });
    }

    // 3. レスポンスをストリーミング転送（バッファリング不要）
    const respHeaders: Record<string, string> = {
      'Content-Type': assetRes.headers.get('Content-Type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    };
    for (const key of ['Content-Length', 'Content-Range', 'Accept-Ranges']) {
      const val = assetRes.headers.get(key);
      // eslint-disable-next-line security/detect-object-injection
      if (val) respHeaders[key] = val;
    }

    return new Response(assetRes.body, { status: assetRes.status, headers: respHeaders });
  } catch (e: unknown) {
    // 4. 実行時エラーの可視化
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: 'Internal Worker Error', message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// まぁ、普通に考えてアセットサーバーの情報は .env に入れるべきだよね。 --- IGNORE ---
// 当然、ソースコードにそれらの情報は書かれていない。 --- IGNORE ---
// わかったら、env.d.ts はちゃんと書いておけよ。 --- IGNORE ---

// Well, logically speaking, asset server information should be put in the .env file, right? --- IGNORE ---
// Of course, that information is not written in the source code. --- IGNORE ---
// If you understand, make sure to write env.d.ts properly. --- IGNORE ---
