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
  // VRoid Hub API側の問題で、APIアクセスがIPv6接続に対応していなく、
  // 暫定処置で拡張子が含まれる場合はアセットサーバーから取得する実装に変更。
  // Due to an issue with the VRoid Hub API not supporting IPv6 connections,
  // as a temporary measure, if the extension is included, change the implementation to fetch from the asset server.
  // <https://discord.com/channels/1137920866156544040/1137920867091877908/1486259418805964942>
  const vrm = props.vrm;
  return vrm.endsWith('.vrm') ? `/api/asset/${vrm}` : `/api/vrm/${vrm}`;
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
    directionalLight: { color: 0xfffde7, intensity: 2 },
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
    const { url: vrmUrl } = (await apiRes.json()) as { url: string };

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
