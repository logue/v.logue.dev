import { unzipSync } from 'fflate';

/**
 * アセットサーバーからファイルをバイナリとして取得する
 * Cloudflare Functions プロキシ経由で取得（ブラウザからの直接アクセスは CORS で制限）
 * なぜ、こういう仕組みなのかは useVrmLoader.ts のコメントを参照。
 * Fetch a file from the asset server as binary via the Cloudflare Functions proxy.
 * @param path アセットサーバーのファイルパス（例: 'audio/bgm.ogg'）
 * @returns ArrayBuffer
 */
export async function fetchAsset(path: string): Promise<ArrayBuffer> {
  // パスセグメントごとにエンコードしてスラッシュ区切りを保持する
  // Encode each path segment while keeping slash separators
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(`/api/assets/${encodedPath}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch asset: ${res.status} ${res.statusText}`);
  }
  return res.arrayBuffer();
}

/**
 * ZIP バッファから特定のファイルを取り出す。ネットワーク通信はしない。
 * 呼び出し側でファイル名を許可リスト検証してから渡すこと。
 * Extract a single file from a ZIP buffer. No network access.
 * Callers must validate the file name against an allowlist first.
 * @param zipBuffer ZIP の ArrayBuffer
 * @param fileName ZIP 内のファイルパス（検証済み）
 * @returns 取り出したファイルの ArrayBuffer
 */
export function extractFromZip(zipBuffer: ArrayBuffer, fileName: string): ArrayBuffer {
  const unzipped = unzipSync(new Uint8Array(zipBuffer));

  // Object Injection 対策: hasOwn で存在確認してからアクセス
  // Object injection guard: check existence with hasOwn before access
  if (!Object.hasOwn(unzipped, fileName)) {
    throw new Error(`File ${fileName} not found in ZIP`);
  }
  // fileName は呼び出し側で許可リスト検証済み。 -- IGNORE
  // fileName is validated against an allowlist by the caller. -- IGNORE
  const data: Uint8Array | undefined = unzipped[fileName]; // eslint-disable-line security/detect-object-injection -- validated against allowlist by caller
  if (!data) throw new Error(`File ${fileName} not found in ZIP`);

  // slice() でコピーを作り SharedArrayBuffer ではない純粋な ArrayBuffer を得る
  // slice() makes a copy so we get a plain ArrayBuffer, not a SharedArrayBuffer
  return data.slice().buffer;
}

/**
 * VRM の取得先を解決する。VRM ファイルのパスを直接持っている場合と、VRoid Hub の ID を持っている場合の両方に対応する。
 * 詳細は functions/api/vrm/[avatar_id].ts を参照。
 * Resolve a loadable VRM URL. Supports both a direct VRM file path and a VRoid Hub avatar ID.
 * For details, see functions/api/vrm/[avatar_id].ts.
 * @param vrm VRM ファイルのパスもしくは ID / VRM file path or ID
 * @returns GLTFLoader に渡せる URL と、不要になったときに呼ぶ解放関数
 *          A URL GLTFLoader can load, and a release function to call once it is no longer needed
 */
export async function resolveVrmUrl(vrm: string): Promise<{ url: string; release: () => void }> {
  const endpoint = vrm.endsWith('.vrm') ? `/api/assets/${vrm}` : `/api/vrm/${vrm}`;
  const res = await fetch(endpoint);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`VRM API failed: ${res.status} ${body.slice(0, 200)}`);
  }

  // VRoid Hub API は JSON、アセットサーバーは VRM バイナリを返す
  // VRoid Hub API returns JSON; the asset server returns VRM binary
  const contentType = res.headers.get('Content-Type') ?? '';
  if (contentType.includes('application/json')) {
    const { url } = (await res.json()) as { url: string };
    return { url, release: () => {} };
  }

  const url = URL.createObjectURL(await res.blob());
  return { url, release: () => URL.revokeObjectURL(url) };
}

// データを ZIP から取り出すのは、自分にとっては割と枯れた技術である。 -- IGNORE
// 前（１３年ぐらい前）はzlib.jsで実装していたが、fflateはWebAssemblyも使っているらしく、より高速に動作するようだ。 -- IGNORE

// Extracting data from ZIP is a fairly well-established technique for me. -- IGNORE
// I used to implement this with zlib.js (about 13 years ago), but fflate seems to use WebAssembly as well, and appears to be faster. -- IGNORE
