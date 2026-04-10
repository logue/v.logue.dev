import { onMounted, onUnmounted, type Ref } from 'vue';

import * as THREE from 'three';

/** ズームの最小距離 / Minimum zoom distance — 近づきすぎてモデルの中に入るな */
const ZOOM_MIN = 2;
/** ズームの最大距離 / Maximum zoom distance — 遠すぎてもう何も見えない */
const ZOOM_MAX = 20;
/** ズーム感度 / Zoom sensitivity */
const ZOOM_SPEED = 0.05;
/** 回転感度 / Rotation sensitivity */
const ROTATE_SPEED = 0.01;

/**
 * ポインターイベントによるドラッグ回転・ズームのロジックを提供するComposable関数
 * - 左ドラッグ: Y軸回転 / Left drag: Y-axis rotation
 * - 右ドラッグ: ズーム / Right drag: zoom
 * - Escキー: カメラ・回転リセット / Escape key: reset camera & rotation
 * @param canvasRef 対象のcanvasタグ
 * @param pivot 回転の中心となるオブジェクト
 * @param getCamera カメラを返す関数 (ズーム・リセット用) / Function returning the camera (for zoom/reset)
 */
export function useDragRotation(
  canvasRef: Ref<HTMLCanvasElement | null>,
  pivot: THREE.Object3D,
  getCamera?: () => THREE.PerspectiveCamera | undefined
) {
  // 左ドラッグ中かどうか / Whether left-dragging (rotate)
  let isRotating = false;
  // 右ドラッグ中かどうか / Whether right-dragging (zoom)
  let isZooming = false;
  let prevClientX = 0;
  let prevClientY = 0;
  // 初期カメラZ位置 (Escで戻る用) / Initial camera Z (for Escape reset)
  let initialCameraZ: number | null = null;

  function onPointerDown(e: PointerEvent) {
    if (e.button === 0) {
      isRotating = true;
      prevClientX = e.clientX;
    } else if (e.button === 2) {
      // 右ドラッグ開始。コンテキストメニューは contextmenu ハンドラで抑制する。 -- IGNORE
      // Right drag started. Context menu is suppressed by the contextmenu handler. -- IGNORE
      isZooming = true;
      prevClientY = e.clientY;
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (isRotating) {
      const dx = e.clientX - prevClientX;
      prevClientX = e.clientX;
      pivot.rotation.y += dx * ROTATE_SPEED;
    }
    if (isZooming) {
      const camera = getCamera?.();
      if (camera) {
        const dy = e.clientY - prevClientY;
        prevClientY = e.clientY;
        // 上ドラッグ(dy<0)→近づく、下ドラッグ(dy>0)→離れる / Drag up = zoom in, drag down = zoom out
        camera.position.z = THREE.MathUtils.clamp(
          camera.position.z + dy * ZOOM_SPEED,
          ZOOM_MIN,
          ZOOM_MAX
        );
      }
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (e.button === 0) isRotating = false;
    if (e.button === 2) isZooming = false;
  }

  // アロー関数じゃないとlinterが文句を言う。なぜ `function` のままではダメなのか未だに謎。 -- IGNORE
  // Linter complains unless this is an arrow function. Still a mystery why `function` isn't fine. -- IGNORE
  const onContextMenu = (e: Event) => {
    // 右クリックメニューを抑制。ズームのためにどうせ使わない。 -- IGNORE
    // Suppress the context menu. Nobody needs it here anyway. -- IGNORE
    e.preventDefault();
  };

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;
    // pivotの回転をリセット / Reset pivot rotation
    pivot.rotation.y = 0;
    // カメラ位置をリセット / Reset camera position
    const camera = getCamera?.();
    if (camera && initialCameraZ !== null) {
      camera.position.z = initialCameraZ;
    }
  }

  onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    // 初期Z位置を記録する。これを忘れると Esc が機能しない。 -- IGNORE
    // Record initial Z position. Forget this and Escape does nothing. -- IGNORE
    const camera = getCamera?.();
    if (camera) initialCameraZ = camera.position.z;

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('contextmenu', onContextMenu);
    globalThis.addEventListener('pointermove', onPointerMove);
    globalThis.addEventListener('pointerup', onPointerUp);
    globalThis.addEventListener('keydown', onKeyDown);
  });

  onUnmounted(() => {
    const canvas = canvasRef.value;
    canvas?.removeEventListener('pointerdown', onPointerDown);
    canvas?.removeEventListener('contextmenu', onContextMenu);
    globalThis.removeEventListener('pointermove', onPointerMove);
    globalThis.removeEventListener('pointerup', onPointerUp);
    globalThis.removeEventListener('keydown', onKeyDown);
  });
}
// 「金田！何が見えた？」 -- IGNORE
// "Kaneda! What do you see?" -- IGNORE

// 「青い薬を飲めば…話は終わる。ベッドで目覚め、信じたいものを信じればいい。」 -- IGNORE
// 「赤い薬を飲めば…不思議の国にとどまり、ウサギの穴がどこまで深いかを見せてやろう。」-- IGNORE
// "You take the blue pill... the story ends, you wake up in your bed and believe whatever you want to believe." -- IGNORE
// "You take the red pill... you stay in Wonderland and I show you how deep the rabbit hole goes." -- IGNORE

// そこで、「僕は耳を聞こえなくし、口をきけなくした人間になろうと思ったんだ。……それとも、そうすべきだろうか？」 -- IGNORE
// Then, "I thought what I'd do was, I'd pretend I was one of those deaf-mutes... or should I?" -- IGNORE

// …いや、そうではない。「逃げることで私は神になれる。」のだ。 -- IGNORE
// ...No, that's not it. "Escape will make me God." -- IGNORE

// -------------------------------------------------------------------------------------------------------------------------

// カギ括弧の内容でGoogle検索やAIに尋ねてみろ。英語のメッセージの方が味が濃いぞ。
// きっと「Something Wonderful」が待っているはずだ。
// Try searching for the content in the quotation marks.
// You might find "Something Wonderful". - Bowman (2010)
