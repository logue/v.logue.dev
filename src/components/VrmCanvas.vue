<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import * as THREE from 'three';

import { useAssetLoader } from '@/composables/useAssetLoader';
import { useDragRotation } from '@/composables/useDragRotation';
import { useThreeScene } from '@/composables/useThreeScene';
import { useVrmLoader } from '@/composables/useVrmLoader';
import { useAppStore } from '@/stores/useAppStore';

interface Props {
  /** VRM ファイルのパスもしくはID */
  vrm: string;
  /** VRMA ZIP ファイルのパス */
  zip: string;
  /** ZIP 内の VRMA ファイルパス */
  vrma: string;
}

/** 3Dオブジェクトのピボット */
const pivot = new THREE.Object3D();
/** プロップ */
const props = defineProps<Props>();
/** 親方向バインディング */
const emit = defineEmits<{
  ready: [];
}>();

/** VRMを表示するキャンバスの参照 */
const canvasRef = ref<HTMLCanvasElement | null>(null);
/** VRMのロード状態。ロード完了まではローディング表示をするために使う。 */
const isLoading = ref(true);
/** VRMファイルのURL。APIから取得する。 */
const vrmFileUrl = computed<string>(() => {
  // VRMプロップが直接VRMファイルのパスを持っている場合と、VRM IDを持っている場合の両方に対応する。
  // 詳細はfunctions/api/vrm/[avatar_id].ts を参照。 --- IGNORE ---
  // Supports both cases where the VRM prop directly holds the path to the VRM file and where it holds a VRM ID.
  // For details, see functions/api/vrm/[avatar_id].ts. --- IGNORE ---
  const vrm = props.vrm;
  return vrm.endsWith('.vrm') ? `/api/assets/${vrm}` : `/api/vrm/${vrm}`;
});

const { vrm, mixer, load } = useVrmLoader(props.vrma, pivot, isLoading);
const { fetchFile } = useAssetLoader();
const store = useAppStore();

useThreeScene(
  canvasRef,
  pivot,
  () => vrm.value,
  () => mixer.value,
  () => store.audioMgr.getBeatIntensity(),
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
    const [apiRes, vrmaZipBuffer] = await Promise.all([
      fetch(vrmFileUrl.value),
      fetchFile(props.zip)
    ]);

    if (!apiRes.ok) {
      const body = await apiRes.text();
      console.error('[VrmCanvas] VRM API failed:', apiRes.status, body.slice(0, 200));
      isLoading.value = false;
      emit('ready');
      return;
    }

    // Check if the response is JSON (VRoid Hub API) or binary (asset server)
    const contentType = apiRes.headers.get('Content-Type') ?? '';
    console.log('[VrmCanvas] Response content-type:', contentType);

    let vrmUrl: string;
    if (contentType.includes('application/json')) {
      // VRoid Hub API から JSON レスポンスを取得する場合
      // Getting JSON response from VRoid Hub API
      const { url: apiUrl } = (await apiRes.json()) as { url: string };
      vrmUrl = apiUrl;
      console.log('[VrmCanvas] Using VRoid Hub URL:', vrmUrl);
    } else {
      // アセットサーバーから直接 VRM バイナリを取得する場合
      // Using binary VRM from asset server directly
      const vrmBlob = await apiRes.blob();
      vrmUrl = URL.createObjectURL(vrmBlob);
      console.log('[VrmCanvas] Using asset server blob URL:', vrmUrl);
    }

    load(vrmUrl, vrmaZipBuffer, props.vrma)
      .then(() => {
        // ロード完了。ready イベントをemitする。
        // Load completed. Emit ready event.
        emit('ready');
      })
      .catch(e => {
        console.error('[VrmCanvas] load() failed:', e);
        isLoading.value = false;
        emit('ready');
      });
  } catch (e) {
    console.error('[VrmCanvas] init failed:', e);
    isLoading.value = false;
    emit('ready');
  }
});
</script>

<template>
  <!-- ここには、自分のアバターが表示される。 -->
  <!-- This is where my avatar is displayed. -->
  <canvas ref="canvasRef" class="mx-auto vrm-canvas"></canvas>
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
