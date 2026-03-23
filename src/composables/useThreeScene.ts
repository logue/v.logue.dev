import { onMounted, onUnmounted, type Ref } from 'vue';

import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';

import type { ThreeSceneOptions } from '@/interfaces/ThreeSceneOptions';

/**
 * Three.js シーン・カメラ・レンダラー・アニメーションループ・リサイズ対応
 * @param canvasRef 対象のcanvasタグ
 * @param pivot 回転の中心となるオブジェクト
 * @param getVrm VRMモデルを取得する関数
 * @param getMixer アニメーションミキサーを取得する関数
 * @param options シーン設定オプション
 */
export function useThreeScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  pivot: THREE.Object3D,
  getVrm: () => VRM | null,
  getMixer: () => THREE.AnimationMixer | null,
  options: ThreeSceneOptions = {}
) {
  const {
    position = { x: 0, y: 0.5, z: 9 },
    lookAt = { x: 0, y: 0.9, z: 0 },
    directionalLight = { color: 0xffffff, intensity: 1 },
    directionalLightPosition = { x: 1, y: 1, z: 1 },
    ambientLight = { color: 0xffffff, intensity: 0.4 },
    perspectiveCamera = { fov: 30, near: 0.1, far: 20 }
    // 色の設定がめんどくさい。なんでこの API は、HEX で指定できないのか？ -- IGNORE
  } = options;
  /* Three.jsのシーン、カメラ、レンダラー、アニメーションループ、リサイズ対応をセットアップするComposable関数 */
  let renderer: THREE.WebGLRenderer;
  /** フレームID */
  let frameId: number;
  /** 前回のフレーム時間 */
  let prevTime = performance.now();
  /** カメラ */
  let camera: THREE.PerspectiveCamera;
  /** キャンバスサイズ監視 */
  let resizeObserver: ResizeObserver;

  // キャッシュとしての運用なのでconstではなくletで定義している。 -- IGNORE
  // あまり好きじゃないんだけどね・・・。 -- IGNORE

  /**
   * サイズ更新（canvas が表示状態になったときも呼ばれる）ハンドラ
   * @param width キャンバスの幅
   * @param height キャンバスの高さ
   */
  const applySize = (width: number, height: number) => {
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(window.devicePixelRatio);
  };

  onMounted(() => {
    if (!canvasRef.value) return;

    const canvas = canvasRef.value;
    // 初期サイズ（非表示時は 0 になるため window サイズをフォールバックに使う）
    const initW = canvas.clientWidth || window.innerWidth;
    const initH = canvas.clientHeight || window.innerHeight;

    // カメラの設定
    camera = new THREE.PerspectiveCamera(
      perspectiveCamera.fov,
      initW / initH,
      perspectiveCamera.near,
      perspectiveCamera.far
    );
    // 位置
    camera.position.set(position.x, position.y, position.z);
    // 注視点
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    renderer.setSize(initW, initH, false);
    renderer.setPixelRatio(window.devicePixelRatio);

    // 色空間の設定。これをしないと、VRMモデルの色が暗くなってしまう。 -- IGNORE
    // Color space settings. If you don't do this, the VRM model's colors will appear darker. -- IGNORE
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    /** シーンの設定 */
    const scene = new THREE.Scene();
    // 「シーン」とは、3D空間内のオブジェクトや光源、カメラなどを管理するコンテナのようなもの。 -- IGNORE
    // A `scene` is like a container that manages objects, light sources, cameras, etc., in a 3D space. -- IGNORE

    /** 平行光源 */
    const light = new THREE.DirectionalLight(directionalLight.color, directionalLight.intensity);
    light.position
      .set(directionalLightPosition.x, directionalLightPosition.y, directionalLightPosition.z)
      .normalize();

    // documnt.appendChildrenみたいな感じで、シーンにオブジェクトを追加していく。 -- IGNORE
    // It's like document.appendChildren, adding objects to the scene. -- IGNORE
    scene.add(light);
    scene.add(new THREE.AmbientLight(ambientLight.color, ambientLight.intensity));

    scene.add(pivot);

    /** アニメーションループ */
    const update = () => {
      frameId = requestAnimationFrame(update);
      /** 現在時刻 */
      const now = performance.now();
      // performance.now() は結構精度が高いぞ。 -- IGNORE
      // performance.now() has quite high precision. -- IGNORE

      /** 前回からの差分時間 */
      const delta = (now - prevTime) / 1000;
      prevTime = now;

      /** アニメーションの更新 */
      getMixer()?.update(delta);
      getVrm()?.update(delta);
      renderer.render(scene, camera);
    };
    update();

    // d-none 解除や、ブラウザのリサイズなどで canvas が変化した時に正しいサイズへ追従するために ResizeObserver を使用する。 -- IGNORE
    // Using ResizeObserver to follow the correct size when the canvas changes due to d-none removal or browser resize. -- IGNORE
    resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      applySize(width, height);
    });
    // オブサーバーを登録する
    resizeObserver.observe(canvas);

    // 昔はsetTimeoutでリサイズをポーリングしていたが、ResizeObserverが広くサポートされるようになった今では、こちらの方が効率的である。 -- IGNORE
    // 他にもScrollObserverなどがある。便利な世の中になったもんだね。 -- IGNORE
    // In the past, we used to poll for resize with setTimeout, but now that ResizeObserver is widely supported, it's more efficient. -- IGNORE
    // There are also ScrollObservers and the like. It's a convenient world. -- IGNORE
  });

  onUnmounted(() => {
    // アンマウント時はリソースをクリーンアップする。 -- IGNORE
    cancelAnimationFrame(frameId);
    resizeObserver?.disconnect();
    renderer?.dispose();
  });
}

// こういう風に VRM の更新とアニメーションミキサーの更新を外部から呼び出せるようにしておくと、シーンのセットアップとアニメーションの管理が分離されて便利である。 -- IGNORE
// ちなみに、生成 AI はこういう細かい設計の話はしてくれないことが多いので、開発者が自分で考えて実装したり、生成AIに指示する必要がある。 -- IGNORE
// まぁ、再利用しやすい形にはしておいたけど、このプロジェクトでは VRM のアニメーションは一種類しか使わない予定なので、そこまで厳密に分ける必要もなかったかもしれない。 -- IGNORE
//
// そうだ、京都へ行こう… --- IGNORE ---

// Making it possible to call VRM updates and animation mixer updates externally like this is convenient because it separates scene setup and animation management. -- IGNORE
// Incidentally, generation AI often doesn't talk about these kinds of detailed design issues, so developers need to think about it and implement it themselves, or instruct the generation AI. -- IGNORE
// Well, I made it in a form that's easy to reuse, but since this project only plans to use one type of VRM animation, it might not have been necessary to separate them so strictly. -- IGNORE
//
// Click your heels and think of Kansas.. --- IGNORE ---
