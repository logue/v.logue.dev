<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import { useTextHighlights, type TextHighlightMap } from '@/composables/useTextHighlights';

/**
 * パララックス効果を実現するためのオフセット値と、ELFダンプを表示するpre要素への参照。
 * Offset value for parallax effect and reference to the pre element displaying the ELF dump.
 */
const offsetY = ref(0);
const preRef = ref<HTMLElement | null>(null);

/**
 * 実はLinuxのExecutable and Linkable Format (ELF) のヘッダのダンプ。 --- IGNORE ---
 * さて、このバイナリには致命的なウソがあるが気づいたかな？ --- IGNORE ---
 * This is actually a dump of the header of the Executable and Linkable Format (ELF) used in Linux. --- IGNORE ---
 * By the way, there's a critical lie in this binary. Did you notice? --- IGNORE ---
 */
const elfDump = `7f 45 4c 46 02 01 01 00  // .ELF....
00 00 00 00 00 00 00 00  // ........
b7 00 3e 00 01 00 00 00  // ..>.....
50 18 40 00 00 00 00 00  // P.@.....
40 00 00 00 00 00 00 00  // @.......
b8 b5 00 00 00 00 00 00  // ........
00 00 00 00 40 00 38 00  // ....@.8.
09 00 40 00 20 00 1f 00  // ..@. ...
06 00 00 00 05 00 00 00  // ........
40 00 00 00 00 00 00 00  // @.......
40 00 40 00 00 00 00 00  // @.@.....
40 00 40 00 00 00 00 00  // @.@.....
01 00 00 00 06 00 00 00  // ........
00 00 00 00 00 00 00 00  // ........
00 00 40 00 00 00 00 00  // ..@.....
00 00 40 00 00 00 00 00  // ..@.....
d0 15 00 00 00 00 00 00  // ........
d0 15 00 00 00 00 00 00  // ........
00 00 20 00 00 00 00 00  // .. .....`;

const highlightMap: TextHighlightMap = {
  magic: {
    pattern: /7f 45 4c 46|\.ELF/g,
    color: 'var(--color-green)'
  },
  comments: {
    pattern: /\/\//gm,
    color: 'var(--color-blue)'
  },
  architecture: {
    // コメントの方のb7は無視されるが仕方があるまい。 --- IGNORE ---
    // The b7 in the comment will be ignored. --- IGNORE ---
    pattern: /\bb7\b/g,
    color: 'var(--color-red)'
  },
  pointers: {
    pattern: /\b40\b|@/g,
    color: 'var(--bs-gray-300)'
  }
};

const { supportsCustomHighlight, fallbackLines, setupHighlights, clearHighlights } =
  useTextHighlights({
    source: elfDump,
    targetRef: preRef,
    highlightMap,
    namespace: 'layer-elf'
  });

function onScroll() {
  // 力付くでパララックス・スクロール
  // By force, parallax scroll
  offsetY.value = -window.scrollY * 0.1;
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  if (supportsCustomHighlight) {
    setupHighlights();
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll);
  clearHighlights();
});
</script>

<template>
  <aside class="position-fixed top-0 left-0 w-100 z-n1">
    <pre
      v-if="supportsCustomHighlight"
      ref="preRef"
      :style="{ transform: `translateY(${offsetY}px)` }"
      class="m-3 overflow-hidden"
      >{{ elfDump }}</pre
    >
    <pre v-else :style="{ transform: `translateY(${offsetY}px)` }" class="m-3 overflow-hidden">
      <template
        v-for="(line, lineIndex) in fallbackLines"
        :key="`fallback-line-${lineIndex}`"
      >
        <template v-for="(segment, segmentIndex) in line.segments" :key="segmentIndex">
          <span v-if="segment.color" :style="{ color: segment.color }">{{ segment.text }}</span>
          <template v-else>{{ segment.text }}</template>
        </template>
        <template v-if="lineIndex < fallbackLines.length - 1">{{ '\n' }}</template>
      </template>
    </pre>
  </aside>
</template>

<style scoped lang="scss">
aside {
  // gray-500 (#adb5bd) は hard-light で背景を明るくするのに絶妙な輝度である。 --- IGNORE ---
  // gray-500 (#adb5bd) has a perfect brightness for hard-light to brighten the background. --- IGNORE ---
  color: var(--bs-gray-500);

  // ブレンドモードを hard-light にすることで、背景に応じて文字が明るくなったり暗くなったりするようにしてみた。 --- IGNORE ---
  // With the hard-light blend mode, the text will become brighter or darker depending on the background. --- IGNORE ---
  mix-blend-mode: hard-light;

  // マウス操作で文字をドラッグできないようにするための CSS プロパティ。 --- IGNORE ---
  // 使いにくくなるしね。 --- IGNORE ---
  // The CSS property to prevent text from being draggable with mouse operations. --- IGNORE ---
  // It can be annoying to accidentally drag the text around. --- IGNORE ---
  pointer-events: none;

  pre {
    // OCRA フォントは、昔のコンピュータのターミナルを思わせる、レトロでサイバーパンクな雰囲気を出すために選んだ。 --- IGNORE ---
    // The OCRA font was chosen to give a retro, cyberpunk vibe reminiscent of old computer terminals. --- IGNORE ---
    font-family: var(--font-ocra), monospace;
    font-size: 3rem;
    line-height: 1.1;
  }
}
</style>
