/// <reference types="vite/client" />
/// <reference types="@cloudflare/workers-types" />

interface ImportMetaEnv {
  /** 開発ツールをクラッシュさせる */
  VITE_DISABLE_DEVTOOLS: boolean;
  /** VRoid HubのアバターID (必須) - URLの /characters/{id} の部分 */
  VITE_VROID_AVATAR_ID: string;
  /** Vroid hubのアプリケーションID (必須) */
  VROID_APP_ID: string;
  /** Vroid hubのクライアントシークレット (必須) */
  VROID_CLIENT_SECRET: string;
  /** VRoid Hubのリフレッシュトークン (必須) */
  VROID_REFRESH_TOKEN: string;
  /** アセットサーバーのホストURL (必須)  */
  ASSET_HOST: string;
}

// クライアントIDとシークレットは、VRoid Hub API (https://hub.vroid.com/oauth/applications) でアプリケーションを作成して取得できる。 --- IGNORE ---
// Client ID and secret can be obtained by creating an application in the VRoid Hub API (https://hub.vroid.com/oauth/applications). --- IGNORE ---

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface PagesFunction<T> {
  (context: { env: T; request: Request }): Promise<Response>;
}

declare module '*.glsl' {
  const source: string;
  export default source;
}

declare module '*.glsl?raw' {
  const source: string;
  export default source;
}
