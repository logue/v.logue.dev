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
    <div class="shutter-panel">
      <div class="upper-triangle bg-dark w-100 h-100">
        <div class="grid-background position-absolute inset-0"></div>
      </div>

      <div class="lower-triangle bg-dark w-100 h-100">
        <div class="grid-background position-absolute inset-0"></div>
      </div>
    </div>
    <!-- ここで、ユーザーは ACCESS する。 -->
    <!-- アニメーションは、左右に裂ける感じで。 -->
    <!-- どうせ見えないから、アニメーション中もシステムが起動している感を出すために、背景にグリッドを重ねる。 -->
    <!-- The user grants ACCESS here. -->
    <!-- The animation is like tearing apart horizontally. -->
    <!-- Since it's invisible anyway, overlay a grid on the background to give a sense that the system is booting up even during the animation. -->

    <div class="container text-center">
      <div v-if="isLoading || !ready" class="display-6">
        <span class="blink">SYSTEM_SYNCHRONIZING...</span>
      </div>

      <div v-else class="action-zone">
        <div class="display-6 mb-4 philosophy">
          <blockquote class="mb-3" lang="ja">
            何でもできるということは、
            <strong>自由度が高い</strong>
            ではなく、
            <wbr />
            <strong>どうとでもなってしまう</strong>
            ということである。
          </blockquote>
          <blockquote lang="en">
            Being able to do anything doesn't mean
            <strong>high freedom</strong>
            ,
            <br />
            but rather that it can become
            <strong>anything</strong>
            .
          </blockquote>
        </div>
        <!-- ここで、ユーザーは ACCESS する。 -->
        <!-- The user grants ACCESS here. -->
        <!-- ちなみに、この哲学的な引用は、マラソンルビコンを思い起こさせる白と灰色のメッセージで表示される。 --- IGNORE -->
        <!-- By the way, this philosophical quote is displayed as a white and gray message reminiscent of the Marathon Rubicon. --- IGNORE -->
        <button class="access-button btn btn-outline-success" @click="handleAccess">
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

  .container {
    z-index: 1033;
    color: var(--bs-light);
    // ここでBootstrapのコンテナを使うのは、単に中央寄せとレスポンシブ対応が楽だから。 --IGNORE --
    // The reason for using Bootstrap's container here is simply that it makes centering and responsive design easier. --IGNORE --
    font-family: 'Courier New', Courier, monospace;
    transition: opacity 0.4s ease;

    blockquote {
      font-style: italic;
      &[lang='ja'] {
        &:before {
          content: '「';
        }
        &:after {
          content: '」';
        }
      }
      &[lang='en'] {
        &:before {
          content: '“';
        }
        &:after {
          content: '”';
        }
      }
    }
  }

  .blink {
    animation: blink-animation 1s steps(2, start) infinite;
    // そういえば、昔<blink>タグってあったよね。 --- IGNORE ---
    // By the way, there used to be a <blink> tag, didn't there? --- IGNORE ---
  }

  .philosophy {
    // ちょっとした哲学的な引用を表示するエリア。 --- IGNORE ---
    // An area to display a little philosophical quote. --- IGNORE ---
    font-family: var(--font-lubri), sans-serif;
    color: var(--bs-gray-500);
    // レスポンシブでもボヤけない、ベクトルの強み。
    // The strength of vectors that don't blur even on responsive displays.
    text-transform: none;
    opacity: 0.9;
    strong {
      color: var(--bs-white);
    }
  }

  .access-button {
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(var(--bs-grid-rgb), 0.2);
      box-shadow: 0 0 15px rgba(var(--bs-grid-rgb), 0.8);
    }
  }

  .shutter-panel {
    z-index: 1032;
    position: absolute;
    inset: 0;
    pointer-events: none; // アニメーション中に後ろをクリックできるように
  }

  // 幕が左右、あるいは上下に裂けるための準備。
  // Preparing for the curtains to tear horizontally or vertically.
  .upper-triangle,
  .lower-triangle {
    position: absolute;
    inset: 0;
    background: var(--bs-dark);
    z-index: 1032;
    transition: transform 0.8s cubic-bezier(0.85, 0, 0.15, 1);
  }

  // Grid は三角形の「下（後ろ）」に固定して置いておく
  .grid-background {
    z-index: 1030; // 三角形(1032)より下、コンテナ(1033)よりは下
    // 背景にグリッドを重ねることで、単なる暗転ではなく、システムが起動している感を出す。 --IGNORE --
    // By overlaying a grid on the background, it gives a sense that the system is booting up, rather than just a simple blackout. --IGNORE --
    background-image:
      linear-gradient(rgba(var(--grid-green-rgb), 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(var(--grid-green-rgb), 0.1) 1px, transparent 1px);
    background-size: 40px 40px;
    background-color: var(--bs-dark);
    pointer-events: none;
    inset: 0;
    // fixed にすることで、シャッターが動いてもグリッドは「背景」に固定される。 --- IGNORE ---
    // By setting it to fixed, the grid remains "background" fixed even when the shutters move. --- IGNORE ---
    background-attachment: fixed;
  }

  // 左上の三角形。
  .upper-triangle {
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }

  // 右下の三角形。
  .lower-triangle {
    clip-path: polygon(100% 0, 100% 100%, 0 100%);
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
