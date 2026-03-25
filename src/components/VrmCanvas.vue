<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { onMounted, ref } from 'vue';

import * as THREE from 'three';

import { useAssetLoader } from '@/composables/useAssetLoader';
import { useDragRotation } from '@/composables/useDragRotation';
import { useThreeScene } from '@/composables/useThreeScene';
import { useVrmLoader } from '@/composables/useVrmLoader';

interface Props {
  /** VRM モデル URL を返す API エンドポイント */
  api: string;
  /** VRMA ZIP ファイルのアセットサーバーパス */
  zip: string;
  /** ZIP 内の VRMA ファイルパス */
  vrma: string;
}

const props = defineProps<Props>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isLoading = ref(true);
const pivot = new THREE.Object3D();

const { vrm, mixer, load } = useVrmLoader(props.vrma, pivot, isLoading);
const { fetchFile } = useAssetLoader();

useThreeScene(
  canvasRef,
  pivot,
  () => vrm.value,
  () => mixer.value,
  {
    position: { x: 0, y: 0.5, z: 7 },
    ambientLight: { color: 0xf8f9fa, intensity: 1.2 },
    directionalLight: { color: 0xfffde7, intensity: 1 },
    directionalLightPosition: { x: 0, y: 1, z: 2 },
    perspectiveCamera: { fov: 15, near: 0.1, far: 20 }
  }
);
useDragRotation(canvasRef, pivot);

onMounted(async () => {
  // API から VRM URL を取得しつつ、VRMA ZIP を並列でフェッチする。
  // Fetch VRM URL from API while downloading the VRMA ZIP in parallel.
  try {
    const [apiRes, vrmaZipBuffer] = await Promise.all([fetch(props.api), fetchFile(props.zip)]);

    if (!apiRes.ok) {
      const body = await apiRes.text();
      console.error('[VrmCanvas] VRM API failed:', apiRes.status, body.slice(0, 200));
      isLoading.value = false;
      return;
    }
    const { url: vrmUrl } = (await apiRes.json()) as { url: string };

    load(vrmUrl, vrmaZipBuffer, props.vrma).catch(e =>
      console.error('[VrmCanvas] load() failed:', e)
    );
  } catch (e) {
    console.error('[VrmCanvas] init failed:', e);
    isLoading.value = false;
  }
});
</script>

<template>
  <!-- ここには、自分のアバターが表示される。 -->
  <!-- This is where my avatar is displayed. -->
  <section class="d-flex justify-content-center align-items-center flex-column my-5">
    <canvas ref="canvasRef" class="mx-auto vrm-canvas"></canvas>
  </section>
  <!-- “なぜ、男アバターを使うのか？”これは「自由度が高いということは、何でもできるではなく、どうとでも作れてしまう」という自分の哲学に基づく。 -->
  <!-- VRoid に限らず女アバターは服の種類が多く、「かわいく見せる」ことは誰にとっても簡単なことである。また、単に「かわいい」といってもその方法は多岐にわたる。 -->
  <!-- しかし、男アバターはもともと服の種類が少ない上に、「かっこよく見せたい」という需要のほうがはるかに多いので「かわいく見せる」という事は意外と困難である。 -->
  <!-- 「かわいい男アバター」という、あえて制約の多いところに挑戦するという行為そのものが、「制約下で最良の結果を出す」という考え方に結びついているだろう。 -->

  <!-- “Why use a male avatar?” This is based on my philosophy that "high freedom means not just being able to do anything, but being able to create anything." -->
  <!-- Not just in VRoid, but in general, female avatars have a wide variety of clothing options, making it easy for anyone to look "cute". And even when we say "cute", there are many different ways to achieve that. -->
  <!-- However, male avatars have fewer clothing options to begin with, and since the demand to look "cool" is much higher, making them look "cute" can be surprisingly difficult. -->
  <!-- The act of deliberately challenging the more constrained "cute male avatar" scenario can be said to be based on my philosophy of producing the best results under constraints. -->

  <!-- A E S T H E T I C S --IGNORE -->
</template>

<style scoped>
.vrm-canvas {
  /* aspect-ratio を明示しないと、canvas.width 属性が変わるたびにレイアウト幅も変わり ResizeObserver が無限に発火する。 */
  /* Without explicit aspect-ratio, layout width tracks canvas.width attribute, causing an infinite ResizeObserver feedback loop. */
  aspect-ratio: 3 / 4;
  height: 75vh;
  filter: drop-shadow(3px 3px 64px 3px var(--bs-black))
    drop-shadow(2px 2px 15px 5px var(--bs-black));
}
</style>
