<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';

import * as THREE from 'three';

import { useDragRotation } from '@/composables/useDragRotation';
import { useThreeScene } from '@/composables/useThreeScene';
import { useVrmLoader } from '@/composables/useVrmLoader';
import { fetchAsset, resolveVrmUrl } from '@/services/assetLoader';
import { useAppStore } from '@/stores/useAppStore';

const { vrm, zip, vrma } = defineProps<{
  /** VRM ファイルのパスもしくはID / VRM file path or ID */
  vrm: string;
  /** VRMA ZIP ファイルのパス / VRMA ZIP file path */
  zip: string;
  /** ZIP 内の VRMA ファイルパス / VRMA file path inside the ZIP */
  vrma: string;
}>();

/**
 * ロード処理が（成否に関わらず）終わったら通知する。失敗してもサイトは開けたいので。
 * Notifies once loading has settled, success or not. The site should open even on failure.
 */
const emit = defineEmits<{
  ready: [];
}>();

/** 3Dオブジェクトのピボット / Pivot of the 3D object */
const pivot = new THREE.Object3D();
/** VRMを表示するキャンバスの参照 / Reference to the canvas displaying the VRM */
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas');

const store = useAppStore();
const { vrm: model, mixer, load } = useVrmLoader(vrma, pivot);

const { getCamera } = useThreeScene(canvasRef, {
  pivot,
  onFrame: delta => {
    mixer.value?.update(delta);
    model.value?.update(delta);
  },
  getBeatIntensity: store.getBeatIntensity,
  options: {
    position: { x: 0, y: 0.5, z: 7 },
    ambientLight: { color: 0xf8f9fa, intensity: 1.2 },
    directionalLight: { color: 0xfffde7, intensity: 1 },
    directionalLightPosition: { x: 0, y: 1, z: 2 },
    perspectiveCamera: { fov: 15, near: 0.1, far: 20 }
  }
});
useDragRotation(canvasRef, pivot, getCamera);

onMounted(async () => {
  // API から VRM URL を取得しつつ、VRMA ZIP を並列でフェッチする。
  // Fetch VRM URL from API while downloading the VRMA ZIP in parallel.
  try {
    const [vrmSource, vrmaZipBuffer] = await Promise.all([resolveVrmUrl(vrm), fetchAsset(zip)]);
    try {
      await load(vrmSource.url, vrmaZipBuffer, vrma);
    } finally {
      vrmSource.release();
    }
  } catch (e) {
    console.error('[VrmCanvas] init failed:', e);
  } finally {
    emit('ready');
  }
});
</script>

<template>
  <!-- ここには、自分のアバターが表示される。 -->
  <!-- This is where my avatar is displayed. -->
  <canvas ref="canvas" class="mx-auto vrm-canvas"></canvas>
</template>

<style scoped>
.vrm-canvas {
  /* aspect-ratio を明示しないと、canvas.width 属性が変わるたびにレイアウト幅も変わり ResizeObserver が無限に発火する。 */
  /* Without explicit aspect-ratio, layout width tracks canvas.width attribute, causing an infinite ResizeObserver feedback loop. */
  aspect-ratio: 3 / 4;
  height: 75vh;
}
</style>
