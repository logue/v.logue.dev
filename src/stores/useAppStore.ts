import { defineStore } from 'pinia';
import { computed, shallowRef } from 'vue';

import { AudioManager } from '@/services/AudioManager';

/**
 * オーディオの再生状態と、カバーを外してよいかの準備状態を管理する。
 * AudioManager 本体は外に出さず、必要な操作だけをアクションとして公開する。
 * Manages audio playback and the readiness used to unlock the cover.
 * The AudioManager instance stays private; only the needed operations are exposed as actions.
 */
export const useAppStore = defineStore('app', () => {
  // AudioManager はシングルトン的に使う。もう一度言うぞ。
  // AudioManager is used as a singleton. Saying it again.
  const audioMgr = new AudioManager();
  let audioInitialized = false;

  /** オーディオの準備処理が（成否に関わらず）終わったか / Whether audio preparation has settled (success or not) */
  const audioSettled = shallowRef(false);
  /** VRM の準備処理が（成否に関わらず）終わったか / Whether VRM preparation has settled (success or not) */
  const vrmSettled = shallowRef(false);
  const audioPlaying = shallowRef(false);

  /**
   * オーディオと VRM の両方が揃ったら ACCESS できる。
   * ACCESS is allowed once both audio and VRM are ready.
   */
  const isReady = computed(() => audioSettled.value && vrmSettled.value);
  const isAudioPlaying = computed(() => audioPlaying.value);

  /**
   * バックグラウンドでオーディオを準備だけしておく。まだ鳴らさない。
   * 失敗してもサイトは見せたいので、準備完了扱いにする。
   * Pre-initialize audio in the background. Don't play yet.
   * Even on failure, mark it settled so the site still opens.
   */
  async function initAudio(buffer: ArrayBuffer) {
    if (audioInitialized) return;
    try {
      await audioMgr.init(buffer);
      audioInitialized = true;
    } catch (e) {
      console.warn('[useAppStore] audio init failed:', e);
    } finally {
      audioSettled.value = true;
    }
  }

  /**
   * ユーザーが ACCESS を押したらここを呼ぶ。
   * ユーザー操作のコンテキスト内で start() するので AudioContext が解放される。
   * Call this when the user presses ACCESS.
   * Calling start() within the user gesture context ensures AudioContext is unlocked.
   */
  function startAudio() {
    if (!audioInitialized) return;
    audioMgr.start();
    audioPlaying.value = audioMgr.isPlaying;
  }

  /**
   * オーディオを一時停止する
   * Pause audio playback.
   */
  async function pauseAudio() {
    await audioMgr.pause();
    audioPlaying.value = audioMgr.isPlaying;
  }

  /**
   * 一時停止したオーディオを再開する
   * Resume paused audio playback.
   */
  async function resumeAudio() {
    await audioMgr.resume();
    audioPlaying.value = audioMgr.isPlaying;
  }

  /**
   * 再生/一時停止をトグルする
   * Toggle play/pause.
   */
  async function toggleAudio() {
    await (audioPlaying.value ? pauseAudio() : resumeAudio());
  }

  /**
   * 現在のビート強度 (0.0 - 1.0)。グリッチシェーダーが毎フレーム読む。
   * Current beat intensity (0.0 - 1.0). Read every frame by the glitch shader.
   */
  function getBeatIntensity() {
    return audioMgr.getBeatIntensity();
  }

  /**
   * VRM の準備が（成否に関わらず）終わったことを通知する。真偽値ひとつに人生を託す設計。
   * Notify that VRM preparation has settled. Entire flow hanging on one boolean, as usual.
   */
  function markVrmSettled() {
    vrmSettled.value = true;
  }

  return {
    isReady,
    isAudioPlaying,
    initAudio,
    startAudio,
    pauseAudio,
    resumeAudio,
    toggleAudio,
    getBeatIntensity,
    markVrmSettled
  };
});
