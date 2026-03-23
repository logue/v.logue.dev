<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const offsetY = ref(0);

/** 力付くでパララックス・スクロール */
function onScroll() {
  offsetY.value = -window.scrollY * 0.25;
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>

<template>
  <pre
    class="position-fixed overflow-hidden top-0 left-0 w-100 pa-3 z-n1"
    :style="{ transform: `translateY(${offsetY}px)` }"
  ><span style="color: var(--color-green)">7f 45 4c 46</span> 02 01 01 00  <span style="color: var(--color-blue)">//</span> <span style="color:var(--color-green)">.ELF</span>....
00 00 00 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> ........
<span style="color: var(--color-red)">b7</span> 00 3e 00 01 00 00 00  <span style="color: var(--color-blue)">//</span> <span style="color: var(--color-red)">.</span>.&gt;.....
50 18 <span style="color: var(--bs-gray-300)">40</span> 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> P.<span style="color: var(--bs-gray-200)">@</span>.....
<span style="color: var(--bs-gray-300)">40</span> 00 00 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> <span style="color: var(--bs-gray-200)">@</span>.......
b8 b5 00 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> ........
00 00 00 00 <span style="color: var(--bs-gray-300)">40</span> 00 38 00  <span style="color: var(--color-blue)">//</span> ....<span style="color: var(--bs-gray-200)">@</span>.8.
09 00 <span style="color: var(--bs-gray-300)">40</span> 00 20 00 1f 00  <span style="color: var(--color-blue)">//</span> ..<span style="color: var(--bs-gray-200)">@</span>. ...
06 00 00 00 05 00 00 00  <span style="color: var(--color-blue)">//</span> ........
<span style="color: var(--bs-gray-300)">40</span> 00 00 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> <span style="color: var(--bs-gray-200)">@</span>.......
<span style="color: var(--bs-gray-300)">40</span> 00 <span style="color: var(--bs-gray-300)">40</span> 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> <span style="color: var(--bs-gray-200)">@</span>.<span style="color: var(--bs-gray-200)">@</span>.....
<span style="color: var(--bs-gray-300)">40</span> 00 <span style="color: var(--bs-gray-300)">40</span> 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> <span style="color: var(--bs-gray-200)"><span style="color: var(--bs-gray-200)">@</span></span>.<span style="color: var(--bs-gray-200)">@</span>.....
01 00 00 00 06 00 00 00  <span style="color: var(--color-blue)">//</span> ........
00 00 00 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> ........
00 00 <span style="color: var(--bs-gray-300)">40</span> 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> ..<span style="color: var(--bs-gray-200)">@</span>.....
00 00 <span style="color: var(--bs-gray-300)">40</span> 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> ..<span style="color: var(--bs-gray-200)">@</span>.....
d0 15 00 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> ........
d0 15 00 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> ........
00 00 20 00 00 00 00 00  <span style="color: var(--color-blue)">//</span> .. .....</pre>
  <!-- こういうのは、やっぱりテキストで見た方がわかりやすいよね。 --- IGNORE -->
  <!-- ちなみに、ELFはバイナリ形式の実行ファイルで、ヘッダにはマジックナンバー（7f 45 4c 46）が含まれている。 --- IGNORE -->
  <!-- そして、ELFのヘッダには、ファイルの種類やアーキテクチャ、エントリーポイントのアドレスなどの情報が含まれている。 --- IGNORE -->
  <!-- ここでは、ELFのヘッダの最初の16バイトをハイライトしてみた。 --- IGNORE -->
  <!-- 例えば、7f 45 4c 46は、ELFファイルのマジックナンバーで、これがあることでファイルがELF形式であることがわかる。 --- IGNORE -->
  <!-- そして、02は、ELFのクラスを示していて、これは64ビットのELFファイルであることを意味する。 --- IGNORE -->
  <!-- 赤色のb7は、アーキテクチャを示していて、これはaarch64を意味する。 --- IGNORE -->
  <!-- さてこのバイナリには、致命的な嘘があるけど気づいたかな？ --- IGNORE -->
  <!-- By the way, ELF is a binary format for executable files, and the header contains a magic number (7f 45 4c 46). --- IGNORE -->
  <!-- The ELF header contains information such as the file type, architecture, and entry point address. --- IGNORE -->
  <!-- Here, I highlighted the first 16 bytes of the ELF header. --- IGNORE -->
  <!-- For example, 7f 45 4c 46 is the magic number of an ELF file, which indicates that the file is in ELF format. --- IGNORE -->
  <!-- And 02 indicates the ELF class, which means this is a 64-bit ELF file. --- IGNORE -->
  <!-- The red b7 indicates the architecture, which means aarch64. --- IGNORE -->
  <!-- Now, can you spot the fatal lie in this binary? --- IGNORE -->
</template>

<style scoped>
pre {
  /* gray-500 (#adb5bd) は hard-light で背景を明るくするのに絶妙な輝度 */
  color: var(--bs-gray-500);

  /* 多重シャドウで光の広がりを作る */
  /*
  text-shadow:
    0 0 5px #fffde7,
    0 0 10px rgba(255, 253, 231, 0.8),
    0 0 20px rgba(255, 253, 231, 0.5);
  filter: brightness(1.5) saturate(1.2);
  */

  /* ブレンドモードを有効化 */
  mix-blend-mode: hard-light;

  /* 文字が背景に沈まないよう、不透明度を調整 */
  opacity: 0.9;

  pointer-events: none;
  font-size: 3rem;
  font-family: var(--font-ocra), monospace;
  line-height: 1.1;
}
</style>
