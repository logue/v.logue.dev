import { defineStore } from 'pinia';
import { ref } from 'vue';

import { AudioManager } from '@/services/AudioManager';

/**
 * オーディオの管理のみ。VRM アセットは VrmCanvas が自分でやるようになったのでここは遠慮に。
 * Audio management only. VRM assets are now VrmCanvas's own business, so this store got slimmer.
 */
export const useAppStore = defineStore('app', () => {
  // AudioManager はシングルトン的に使う。もう一度言うぞ。
  // AudioManager is used as a singleton. Saying it again.
  const audioMgr = new AudioManager();
  let audioInitialized = false;
  const vrmReady = ref(false);

  /**
   * バックグラウンドでオーディオを準備だけしておく。まだ鳴らさない。
   * Pre-initialize audio in the background. Don't play yet.
   */
  async function initAudio(buffer: ArrayBuffer) {
    if (audioInitialized) return;
    try {
      await audioMgr.init(buffer);
      audioInitialized = true;
    } catch (e) {
      console.warn('[useAppStore] audio init failed:', e);
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
  }

  /**
   * VRM の準備状態を更新する。真偽値ひとつに人生を託す設計。
   * Update VRM readiness state. Entire flow hanging on one boolean, as usual.
   */
  function setVrmReady(ready: boolean) {
    vrmReady.value = ready;
  }

  return { audioMgr, initAudio, startAudio, vrmReady, setVrmReady };
});
