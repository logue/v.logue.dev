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
  /** オーディオと VRM 両方の準備が完了したかどう */
  ready?: boolean;
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
const isOpening = ref(false);

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
  isOpening.value = true;
  // アニメーションが終わったらカバーを消す。これもユーザーには見えてないところで静かに行われる。
  // After the animation ends, remove the cover. This also happens quietly, out of sight of the user.
  setTimeout(() => emit('access'), 800);
};
</script>

<template>
  <aside
    class="page-cover position-fixed d-flex align-items-center justify-content-center inset-0 w-100 h-100"
    :class="{ 'is-opening': isOpening }"
  >
    <div class="shutter-panel position-absolute z-1">
      <div class="upper-triangle position-absolute bg-dark w-100 h-100">
        <div class="grid-background position-absolute inset-0"></div>
      </div>
      <div class="lower-triangle position-absolute bg-dark w-100 h-100">
        <div class="grid-background position-absolute inset-0"></div>
      </div>
      <!-- アニメーションは、左右に裂ける感じで。 -->
    </div>

    <div class="container position-relative text-center">
      <!-- 読み込み中の描写 -->
      <!-- Loading depiction -->
      <div v-if="isLoading || !ready" class="display-6 blink">SYSTEM_SYNCHRONIZING...</div>

      <div v-else class="action-zone">
        <div class="display-6 mb-4 philosophy">
          <p class="mb-3" lang="ja">
            何でもできるということは、
            <em>自由度が高い</em>
            という事ではなく、
            <br />
            <em>どうとでもなってしまう</em>
            ということである。
          </p>
          <p lang="en">
            Having everything at your disposal isn't
            <em>freedom</em>
            .
            <br />
            It is the inevitability of becoming just...
            <em>anything</em>
            .
          </p>
          <!-- ちなみに、この哲学的な引用は、マラソンルビコンを思い起こさせる、白と灰色のメッセージで表示される。 --- IGNORE -->
          <!-- By the way, this philosophical quote is displayed as a white and gray message reminiscent of the Marathon Rubicon. --- IGNORE -->
        </div>
        <!-- ここで、ユーザーは ACCESS する。 -->
        <!-- どうせ見えないから、アニメーション中もシステムが起動している感を出すために、背景にグリッドを重ねる。 -->
        <!-- The user grants ACCESS here. -->
        <!-- Since it's invisible anyway, layering a grid in the background to give a sense of the system being active even during the animation. -->
        <button class="access-button btn btn-outline-success btn-lg" @click="handleAccess">
          [ ACCESS ]
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped lang="scss">
.page-cover {
  z-index: 1031;
  // 誰よりも前に立ちたいという、浅ましい自己主張。
  // A shallow self-assertion of wanting to stand in front of everyone.

  // シャッターパネル。z-index 1 = コンテンツ(2)の下、ページ背景の上。
  // Shutter panel. z-index 1 = below content (2), above page background.
  .shutter-panel {
    inset: 0;
    z-index: 1;
    pointer-events: none; // アニメーション中に後ろをクリックできるように / Keep interaction through during animation
  }

  // 幕が対角に裂けるための準備。clip-path で三角形に切り抜く。
  // Preparing for the curtains to tear diagonally. Clipped to triangles via clip-path.
  .upper-triangle,
  .lower-triangle {
    inset: 0;
    transition: transform 0.8s cubic-bezier(0.85, 0, 0.15, 1);
  }

  // 左上の三角形。
  .upper-triangle {
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }

  // 右下の三角形。
  .lower-triangle {
    clip-path: polygon(100% 0, 100% 100%, 0 100%);
  }

  // グリッド背景。position/inset は Bootstrap utility (position-absolute inset-0) が担う。
  // Grid background. position/inset handled by Bootstrap utilities on the element.
  .grid-background {
    background-image:
      linear-gradient(rgba(var(--grid-green-rgb), 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(var(--grid-green-rgb), 0.1) 1px, transparent 1px);
    background-size: 40px 40px;
    background-color: var(--bs-dark);
    // fixed にすることで、シャッターが動いてもグリッドは「背景」に固定される。
    // By setting it to fixed, the grid stays "background" even as the shutters animate.
    background-attachment: fixed;
    pointer-events: none;
  }

  .container {
    z-index: 2;
    color: var(--bs-light);
    font-family: 'Courier New', Courier, monospace;
    transition: opacity 0.4s ease;

    p {
      color: var(--bs-gray-500);
      &[lang='ja'] {
        &::before {
          content: '「';
        }
        &::after {
          content: '」';
        }
      }
      &[lang='en'] {
        &::before {
          content: '“';
        }
        &::after {
          content: '”';
        }
      }
      em {
        color: var(--bs-white);
      }
    }
  }

  .blink {
    animation: blink-animation 1s steps(2, start) infinite;
    // そういえば、昔<blink>タグってあったよね。 --- IGNORE ---
    // By the way, there used to be a <blink> tag, didn't there? --- IGNORE ---
  }

  .philosophy {
    font-family: var(--font-lubri), sans-serif;
    color: var(--bs-gray-500);
    text-transform: none;
    opacity: 0.9;

    strong {
      color: var(--bs-white);
    }
  }

  .access-button {
    transition: all 0.2s;

    &:hover {
      background-color: rgba(var(--grid-green-rgb), 0.2);
      box-shadow: 0 0 15px rgba(var(--grid-green-rgb), 0.8);
    }
  }

  // 発火時：三角形をそれぞれの頂点方向へ飛ばす
  &.is-opening {
    .upper-triangle {
      transform: translate(-100%, -100%);
    }

    .lower-triangle {
      transform: translate(100%, 100%);
    }

    .container {
      opacity: 0;
    }
  }
}
</style>
