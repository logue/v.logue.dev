import { onMounted, onUnmounted, type Ref } from 'vue';

import * as THREE from 'three';

/**
 * ポインターイベントによるドラッグ回転のロジックを提供するComposable関数
 * @param canvasRef 対象のcanvasタグ
 * @param pivot 回転の中心となるオブジェクト
 */
export function useDragRotation(canvasRef: Ref<HTMLCanvasElement | null>, pivot: THREE.Object3D) {
  let isDragging = false;
  let prevClientX = 0;

  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    prevClientX = e.clientX;
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - prevClientX;
    prevClientX = e.clientX;
    pivot.rotation.y += dx * 0.01;
  }

  function onPointerUp() {
    isDragging = false;
  }

  onMounted(() => {
    canvasRef.value?.addEventListener('pointerdown', onPointerDown);
    globalThis.addEventListener('pointermove', onPointerMove);
    globalThis.addEventListener('pointerup', onPointerUp);
  });

  onUnmounted(() => {
    canvasRef.value?.removeEventListener('pointerdown', onPointerDown);
    globalThis.removeEventListener('pointermove', onPointerMove);
    globalThis.removeEventListener('pointerup', onPointerUp);
  });
}
