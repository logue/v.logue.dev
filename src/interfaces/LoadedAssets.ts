/**
 * PageCover がオーディオ fetch 完了後に App.vue へ渡すデータ。
 * VRM 関連は VrmCanvas が自分で取りに行く。
 * Data passed from PageCover to App.vue after audio fetch completes.
 * VRM-related stuff is VrmCanvas's own problem.
 */
export interface LoadedAssets {
  /** オーディオファイルの生バイト列。AudioManager に押し付ける。 */
  /** Raw bytes of the audio file. Shoved into AudioManager. */
  audio: ArrayBuffer;
}
