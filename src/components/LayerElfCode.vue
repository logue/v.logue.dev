<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

/**
 * パララックス効果を実現するためのオフセット値と、ELFダンプを表示するpre要素への参照。
 * Offset value for parallax effect and reference to the pre element displaying the ELF dump.
 */
const offsetY = ref(0);
const preRef = ref<HTMLElement | null>(null);

const HIGHLIGHT_NAMES = ['elf-green', 'elf-blue', 'elf-red', 'elf-gray'] as const;

/**
 * 実はLinuxのExecutable and Linkable Format (ELF) のヘッダのダンプ。 --- IGNORE ---
 * さてこのバイナリには致命的なウソがあるが気づいたかな？ --- IGNORE ---
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

const supportsCustomHighlight = canUseCustomHighlight();

interface FallbackLine {
  hexPart: string;
  commentPart: string;
}

interface FallbackSegment {
  text: string;
  className?: 'fallback-green' | 'fallback-red';
}

const fallbackLines: FallbackLine[] = elfDump.split('\n').map(line => {
  const divider = '  // ';
  const dividerIndex = line.indexOf(divider);

  if (dividerIndex < 0) {
    return { hexPart: line, commentPart: '' };
  }

  return {
    hexPart: line.slice(0, dividerIndex),
    commentPart: line.slice(dividerIndex + divider.length)
  };
});

function getFallbackHexSegments(hexPart: string): FallbackSegment[] {
  const tokenRegex = /(7f 45 4c 46|\bb7\b)/g;
  const segments: FallbackSegment[] = [];
  let lastIndex = 0;

  for (const match of hexPart.matchAll(tokenRegex)) {
    if (match.index === undefined) {
      continue;
    }

    if (match.index > lastIndex) {
      segments.push({ text: hexPart.slice(lastIndex, match.index) });
    }

    segments.push({
      text: match[0],
      className: match[0] === 'b7' ? 'fallback-red' : 'fallback-green'
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < hexPart.length) {
    segments.push({ text: hexPart.slice(lastIndex) });
  }

  return segments;
}

/**
 * ブラウザがCSSのカスタムハイライト機能をサポートしているかどうかをチェックする関数。
 * Function to check if the browser supports CSS custom highlights.
 */
function canUseCustomHighlight(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
}

/**
 * CSSのカスタムハイライトをクリアする関数。サポートされていない場合は何もしない。
 * Function to clear CSS custom highlights. Does nothing if not supported.
 */
function clearHighlights(): void {
  if (!canUseCustomHighlight()) {
    return;
  }

  for (const name of HIGHLIGHT_NAMES) {
    CSS.highlights.delete(name);
  }
}

/**
 * 指定されたテキストノードにハイライトを適用する関数。
 * Applies highlights to the specified text node.
 * @param name  ハイライトの名前。CSSで定義された名前と一致する必要がある。/ Name of the highlight. Must match the name defined in CSS.
 * @param textNode  ハイライトを適用するテキストノード。/ The text node to apply the highlight to.
 * @param source  ハイライトの対象となる文字列。/ The string to be highlighted.
 * @param pattern  ハイライトのパターン。正規表現で指定する。/ The pattern for the highlight. Specified as a regular expression.
 */
function applyHighlight(name: string, textNode: Text, source: string, pattern: RegExp): void {
  const highlight = new Highlight();

  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }

    const range = new Range();
    range.setStart(textNode, match.index);
    range.setEnd(textNode, match.index + match[0].length);
    highlight.add(range);
  }

  CSS.highlights.set(name, highlight);
}

/**
 * CSSのカスタムハイライトをセットアップする関数。ブラウザがサポートしていない場合は何もしない。
 * Function to set up CSS custom highlights. Does nothing if the browser does not support it.
 */
function setupHighlights(): void {
  if (!canUseCustomHighlight() || !preRef.value) {
    return;
  }

  const textNode = preRef.value.firstChild;
  if (!(textNode instanceof Text)) {
    return;
  }

  clearHighlights();

  // .ELFのマジックナンバーとヘッダを緑色
  // .ELF magic number and header in green
  applyHighlight('elf-green', textNode, elfDump, /7f 45 4c 46|\.ELF/g);
  // コメント部分を青色
  // Comments in blue
  applyHighlight('elf-blue', textNode, elfDump, /\/\//g);
  // アーキテクチャを示す部分を赤色。ここではaarch64を示す0xB7をハイライトしている。
  // The part indicating the architecture in red. Here, 0xB7 is highlighted, which indicates aarch64.
  applyHighlight('elf-red', textNode, elfDump, /\bb7\b/g);
  // メモリのアドレスやデータを表す部分は明るい灰色
  // Addresses and data are in light gray
  applyHighlight('elf-gray', textNode, elfDump, /\b40|@\b/g);
}

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
    <pre
      v-else
      :style="{ transform: `translateY(${offsetY}px)` }"
      class="m-3 overflow-hidden"
    >
      <template
        v-for="(line, lineIndex) in fallbackLines"
        :key="`fallback-line-${lineIndex}`"
      >
        <template
          v-for="(segment, segmentIndex) in getFallbackHexSegments(line.hexPart)"
          :key="`fallback-segment-${lineIndex}-${segmentIndex}`"
        >
          <span v-if="segment.className" :class="segment.className">{{ segment.text }}</span>
          <template v-else>{{ segment.text }}</template>
        </template>
        <span v-if="line.commentPart" class="fallback-blue">  // {{ line.commentPart }}</span>
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

:global(::highlight(elf-green)) {
  color: var(--color-green);
}

:global(::highlight(elf-blue)) {
  color: var(--color-blue);
}

:global(::highlight(elf-red)) {
  color: var(--color-red);
}

:global(::highlight(elf-gray)) {
  color: var(--bs-gray-300);
}

:global(.fallback-green) {
  color: var(--color-green);
}

:global(.fallback-blue) {
  color: var(--color-blue);
}

:global(.fallback-red) {
  color: var(--color-red);
}
</style>
