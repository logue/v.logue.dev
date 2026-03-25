<script setup lang="ts">
import { ref, onMounted } from 'vue';

import { useAssetLoader } from '@/composables/useAssetLoader';

/**
 * オーディオファイルのパスだけ受け取る。VRM 関連は VrmCanvas の仕事になった。
 * Only receives the audio file path. VRM stuff is now VrmCanvas's problem.
 */
const props = defineProps<{
  /** アセットサーバー上のオーディオファイルパス */
  audio: string;
}>();

/**
 * オーディオ fetch 完了 → バッファを親へ。ACCESS 押下 → 消えろと伝える。
 * Audio fetch done → buffer to parent. ACCESS pressed → tell it to disappear.
 */
const emit = defineEmits<{
  (e: 'loaded', audio: ArrayBuffer): void;
  (e: 'access'): void;
}>();

const isLoading = ref(true);

const { fetchFile } = useAssetLoader();

onMounted(async () => {
  // オーディオだけ取りに行く。VRM は向こうが勝手に取ってくる。
  // Only fetching audio. VRM fetches itself over there.
  try {
    const audio = await fetchFile(props.audio);
    emit('loaded', audio);
    isLoading.value = false;
  } catch (e) {
    // 404 など失敗したら静かに消える。叫んでも誰も聞いてない。
    // On failure (e.g. 404), vanish quietly. Nobody's listening anyway.
    console.warn('[PageCover] Audio fetch failed, dismissing cover:', e);
    emit('access');
  }
});

/**
 * システムをオンラインにする。カバーを消して本体を露わにする。
 * Bring the system online. Remove the cover and reveal the main body.
 */
const handleAccess = () => {
  emit('access');
};
</script>

<template>
  <aside
    class="page-cover position-fixed d-flex align-items-center justify-content-center inset-0 bg-dark"
  >
    <div class="grid-background position-absolute inset-0"></div>

    <div class="interface-container">
      <div v-if="isLoading" class="status-text">
        <span class="blink">SYSTEM_SYNCHRONIZING...</span>
      </div>

      <div v-else class="action-zone">
        <button class="access-button btn bg-transparent py-1 px-3" @click="handleAccess">
          [ ACCESS ]
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.page-cover {
  inset: 0;
  z-index: 9999;
  // 誰よりも前に立ちたいという、浅ましい自己主張。
  // A shallow self-assertion of wanting to stand in front of everyone.

  .grid-background {
    background-image:
      linear-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 255, 65, 0.1) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .access-button {
    background: transparent;
    color: #00ff41; // マトリックス。
    border: 1px solid #00ff41;
    padding: 1rem 2.5rem;
    font-family: 'Courier New', Courier, monospace;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(0, 255, 65, 0.2);
      box-shadow: 0 0 15px #00ff41;
    }
  }

  .blink {
    animation: blink-animation 1s steps(2, start) infinite;
  }

  @keyframes blink-animation {
    to {
      visibility: hidden;
    }
  }
}
</style>
