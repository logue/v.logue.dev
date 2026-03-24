import { unzipSync } from 'fflate';

export const useAssetLoader = () => {
  /**
   * アセットサーバーからファイルをバイナリとして取得する
   * Cloudflare Functions プロキシ経由で取得（ブラウザからの直接アクセスは CORS で制限）
   * なぜ、こういう仕組みなのかはuseTreeScene.tsのコメントを参照。
   * @param path アセットサーバーのファイルパス（例: 'audio/bgm.ogg'）
   * @returns ArrayBuffer
   */
  const fetchFile = async (path: string): Promise<ArrayBuffer> => {
    console.log(`Fetching asset from ${path}...`);
    // パスセグメントごとにエンコードしてスラッシュ区切りを保持する
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const res = await fetch(`/api/assets/${encodedPath}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch asset: ${res.status} ${res.statusText}`);
    }
    return res.arrayBuffer();
  };

  /**
   * ZIPファイルから特定のファイルを取り出す
   * @param path アセットサーバーのzipファイルのパス
   * @param targetFileName 取り出したいファイルの名前
   * @returns ArrayBufferとして返す
   */
  const fetchCompressedFile = async (
    path: string,
    targetFileName: string
  ): Promise<ArrayBuffer> => {
    console.log(`Fetching and decompressing motion from ${path}...`);
    const arrayBuffer = await fetchFile(path);

    // ZIPを展開
    const unzipped = unzipSync(new Uint8Array(arrayBuffer));

    // Object Injection 対策: hasOwn で存在確認してからアクセス
    if (!Object.hasOwn(unzipped, targetFileName)) {
      throw new Error(`File ${targetFileName} not found in ZIP`);
    }
    // eslint-disable-next-line security/detect-object-injection
    const motionData: Uint8Array | undefined = unzipped[targetFileName];
    if (!motionData) throw new Error(`File ${targetFileName} not found in ZIP`);

    // slice() でコピーを作り SharedArrayBuffer ではない純粋な ArrayBuffer を得る
    return motionData.slice().buffer;
  };

  return { fetchFile, fetchCompressedFile };
};

// データを ZIP から取り出すのは、自分にとっては割と枯れた技術である。 -- IGNORE
// 前（１３年ぐらい前）はzlib.jsで実装していたが、fflateはWebAssemblyも使っているらしく、より高速に動作するようだ。 -- IGNORE

// Extracting data from ZIP is a fairly well-established technique for me. -- IGNORE
// I used to implement this with zlib.js (about 13 years ago), but fflate seems to use WebAssembly as well, and appears to be faster. -- IGNORE
