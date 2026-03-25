# v.logue.dev — Project Guidelines

Vue 3 + Vite + Cloudflare Pages/Workers ポートフォリオサイト。Three.js + @pixiv/three-vrm で VRM アバターを 3D 表示し、カスタム GLSL シェーダーやオーディオ連動エフェクトを持つ。

## Architecture

```
src/               Vue 3 SPA
  components/      レイアウト・エフェクト・3D キャンバス
  composables/     Three.js シーン・VRM ロード・アセット・ドラッグ操作
  pages/           ルートに対応するページ (IndexPage.vue のみ)
  shader/          GLSL シェーダー (.glsl インポート)
  styles/          Bootstrap 5 SCSS カスタマイズ + フォント定義
functions/         Cloudflare Pages Functions (edge)
  api/assets/      外部アセットのリバースプロキシ (CORS 回避)
  api/vrm/         VRoid Hub から VRM モデル URL を取得
  api/auth/        VRoid Hub OAuth 2.0 PKCE フロー
```

**デプロイ**: Cloudflare Pages。KV Namespace `TOKEN_STORE` にリフレッシュトークンを保存。

## Build & Dev

```bash
pnpm install           # 依存関係インストール
pnpm dev               # Vite dev サーバー (SPA のみ)
pnpm dev:wrangler      # Wrangler Pages dev (エッジ関数込み)
pnpm build             # vue-tsc --build && vite build
pnpm type-check        # インクリメンタル型チェック
pnpm lint              # oxlint + ESLint + Prettier + Stylelint (全順実行)
pnpm types             # Wrangler 型生成
```

テストフレームワークは未導入。

## TypeScript Configs

プロジェクトは **4 つの tsconfig** を持つ。目的外のファイルを含めないよう注意。

| ファイル               | 対象                                                  |
| ---------------------- | ----------------------------------------------------- |
| `tsconfig.app.json`    | `src/` (Vue SPA)                                      |
| `tsconfig.node.json`   | `vite.config.ts`, `eslint.config.ts` など Node ツール |
| `tsconfig.worker.json` | `functions/` (Cloudflare edge runtime)                |
| `tsconfig.json`        | 上記 3 つを参照するルート                             |

- `tsconfig.app.json` は `noUncheckedIndexedAccess: true` — 配列・オブジェクトアクセスは型チェック強化済み。
- `@/*` は `./src/*` へのエイリアス。

## Conventions

### Composables パターン

ロジックは `src/composables/` に切り出す。Three.js のシーン管理 (`useThreeScene`)、VRM ロード (`useVrmLoader`)、アセット取得 (`useAssetLoader`)、ドラッグ操作 (`useDragRotation`) がモデルケース。戻り値は `ref` または destructure 可能なオブジェクト。

### GLSL シェーダー

`src/shader/*.glsl` を Vite の asset import で直接取り込む。`vertexShader.glsl` はパススルー、`flagmentShader.glsl` がグリッチ・ノイズ・デジタル色エフェクトを実装 (ファイル名に typo あり — `fragment` → `flagment` — 既存のインポートと合わせること)。

### Cloudflare Functions

- `functions/api/assets/[[path]].ts` — パストラバーサル防止用の正規表現 `ALLOWED_FILE_RE` を維持すること。新拡張子を追加する場合は許可リストを更新。
- `functions/api/vrm/[avatar_id].ts` — OAuth トークンリフレッシュロジックは `TOKEN_STORE` KV に依存。レスポンスを `response.json()` で直接パースせず、先にテキストを読み込んでから `JSON.parse` すること (HTML エラーページ対策)。
- 環境変数: `VROID_APP_ID`, `VROID_CLIENT_SECRET`, `VROID_REFRESH_TOKEN` (wrangler secret で管理)。

### スタイル

- `<style scoped lang="scss">` を使用。グローバルスタイルは `src/styles/` のみ。
- Bootstrap 5 のカスタマイズは `src/styles/bootstrap.scss` で SCSS 変数を上書き。

### コメントスタイル

コード内のコメントは **日本語と英語を併記** し、**シニカルなトーン** で記述する。自明なことを真面目に説明するより、皮肉や諦念を交えた一言が好ましい。

```ts
// どうせ誰も読まないけど、一応説明しておく。
// Nobody reads this anyway, but here's the explanation.

// 天才的な実装。触るな。壊れる。
// Genius implementation. Don't touch. It will break.

// なぜこうなったのか、未来の自分への謝罪。
// An apology to my future self for why this happened.
```

### パッケージマネージャー

**pnpm のみ**。`npm` / `yarn` を使わない。`pnpm-workspace.yaml` でワークスペース定義。

## Key Dependencies

| パッケージ                   | 用途                               |
| ---------------------------- | ---------------------------------- |
| `vue` 3 / `vue-router`       | SPA フレームワーク                 |
| `three` + `@pixiv/three-vrm` | 3D レンダリング・VRM               |
| `@pixiv/three-vrm-animation` | VRMA アニメーション                |
| `fflate`                     | ZIP 解凍 (ブラウザ対応)            |
| `bootstrap`                  | CSS フレームワーク                 |
| `@iconify-vue`               | アイコン (Font Awesome 6 バンドル) |
| `@cloudflare/workers-types`  | Cloudflare edge 型定義             |
