<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { onMounted, ref } from 'vue';

import * as THREE from 'three';

import { useDragRotation } from '@/composables/useDragRotation';
import { useThreeScene } from '@/composables/useThreeScene';
import { useVrmLoader } from '@/composables/useVrmLoader';

interface Props {
  /** VRMモデルのAPIエンドポイント（Vroid Hub APIではない） */
  api: string;
  /** VRMモデルが格納されたzipファイルのパス */
  zip: string;
  /** VRMAファイルのパス（zip内のパス） */
  vrma: string;
}

const props = defineProps<Props>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isLoading = ref(true);
const pivot = new THREE.Object3D();

const { vrm, mixer, load } = useVrmLoader(props.api, props.zip, props.vrma, pivot, isLoading);

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

onMounted(() => {
  load();
});
</script>

<template>
  <section class="d-flex justify-content-center align-items-center flex-column my-5">
    <template v-if="isLoading">
      <div class="spinner-border" aria-hidden="true">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="mt-3 small opacity-75">
        SYS_INITIALIZING...
        <br />
        ACCESSING_VROID_HUB...
      </div>
    </template>
    <canvas ref="canvasRef" class="mx-auto vrm-canvas" :class="{ 'd-none': isLoading }"></canvas>
  </section>
  <!-- VRMモデルを表示するためのキャンバス --IGNORE -->
  <!-- ローディング中は、Bootstrapのスピナーとテキストで状態を表示する。 --- IGNORE -->
  <!-- ローディングが完了すると、キャンバスが表示され、VRMモデルがレンダリングされる。 --- IGNORE -->

  <!-- Canvas for displaying the VRM model --IGNORE -->
  <!-- Displays the status with Bootstrap spinner and text while loading. --- IGNORE -->
  <!-- Once loading is complete, the canvas will appear and the VRM model will be rendered. --- IGNORE -->
</template>

<style scoped>
.vrm-canvas {
  height: 75vh;
  filter: drop-shadow(3px 3px 64px 3px var(--bs-black))
    drop-shadow(2px 2px 15px 5px var(--bs-black));
}
</style>
