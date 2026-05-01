import { onMounted, onUnmounted, type Ref } from 'vue';

import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
// パスにexamplesが含まれているのは謎すぎる。 --- IGNORE ---
// It's really strange that the path includes examples. --- IGNORE ---
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

import type { ThreeSceneOptions } from '@/interfaces/ThreeSceneOptions';

// シェーダーのインポート。 --- IGNORE ---
// Importing shaders. --- IGNORE ---
import fragmentShader from '@/shader/fragmentShader.glsl';
import vertexShader from '@/shader/vertexShader.glsl';

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
  getBeatIntensity: () => number,
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
    // The color settings are a hassle. Why can't this API accept HEX values? -- IGNORE
  } = options;
  /* Three.jsのシーン、カメラ、レンダラー、アニメーションループ、リサイズ対応をセットアップするComposable関数 */
  let renderer: THREE.WebGLRenderer;
  /** フレームID */
  let frameId: number;
  /** 前回のフレーム時間 */
  let prevTime = performance.now();
  /** カメラ */
  let camera: THREE.PerspectiveCamera;
  /** ポストプロセス用コンポーザー */
  let composer: EffectComposer;
  /** グリッチシェーダーパス */
  let glitchPass: ShaderPass | undefined;
  /** ビート強度の減衰バッファ */
  let smoothedIntensity = 0;
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
    // setPixelRatio → setSize の順。逆だと dpr が反映される前に canvas 解像度が確定してしまう。
    // setPixelRatio before setSize — otherwise canvas resolution is committed before dpr is applied.
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height, false);
    composer?.setPixelRatio(window.devicePixelRatio);
    composer?.setSize(width, height);
    if (glitchPass) {
      const resolution = glitchPass.uniforms.uResolution?.value as THREE.Vector2 | undefined;
      resolution?.set(width, height);
    }
  };

  onMounted(() => {
    if (!canvasRef.value) return;

    const canvas = canvasRef.value;
    // 初期サイズ（非表示時は 0 になるため window サイズをフォールバックに使う）
    // Initial size (falls back to window size if it's 0 when hidden)
    const initW = canvas.clientWidth || window.innerWidth;
    const initH = canvas.clientHeight || window.innerHeight;

    // カメラの設定。 -- IGNORE
    // The camera settings. -- IGNORE
    camera = new THREE.PerspectiveCamera(
      perspectiveCamera.fov,
      initW / initH,
      perspectiveCamera.near,
      perspectiveCamera.far
    );
    // position は、カメラの位置を指定するためのプロパティである。 -- IGNORE
    // The position property is used to specify the position of the camera. -- IGNORE
    camera.position.set(position.x, position.y, position.z);
    // lookAt は、カメラがどこを向くかを指定するためのメソッドである。 -- IGNORE
    // The lookAt method is used to specify where the camera should look. -- IGNORE
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });

    // setPixelRatio を先に設定してから setSize を呼ぶ。逆順だと中間状態で canvas.width が低解像度のままになる。
    // Set pixel ratio BEFORE setSize to avoid intermediary low-res canvas state.
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(initW, initH, false);

    // 色空間の設定。これをしないと、VRMモデルの色が暗くなってしまう。 -- IGNORE
    // Color space settings. If you don't do this, the VRM model's colors will appear darker. -- IGNORE
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 背景を透明(0)でクリア
    // Clear with transparent (0) background
    renderer.setClearColor(0x000000, 0);

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

    // RenderTarget を作成して Composer に渡す
    const renderTarget = new THREE.WebGLRenderTarget(initW, initH, {
      format: THREE.RGBAFormat, // Alpha を保持
      stencilBuffer: false
    });
    composer = new EffectComposer(renderer, renderTarget);
    composer.addPass(new RenderPass(scene, camera));

    // グリッチをシェーダーで実装する。 -- IGNORE
    // Implementing glitch with shaders. -- IGNORE
    /**
     * [THE_ARCHITECT_LOGIC]
     * Total stability is a mathematical impossibility.
     * Instead of preventing the 'Runaway' (Anomalies), we integrate it.
     * * "The Savior" is just another form of system control.
     * This glitch-shader is the calculated bug that keeps the reality alive.
     */
    glitchPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uResolution: { value: new THREE.Vector2(initW, initH) }
      },
      vertexShader,
      // 暴走やハルシネーションは防ぐものではなく、システムの一部として「配分」するべきものである。 --- IGNORE ---
      // "Runaway" and "Hallucination" are not something to be prevented, but should be "allocated" as part of the system. --- IGNORE ---
      fragmentShader
    });
    composer.addPass(glitchPass);

    // 色空間変換を明示しないと、ポストプロセス経由で色が簡単に迷子になる。
    // Without an explicit output pass, post-processing can quietly bypass expected color conversion.
    composer.addPass(new OutputPass());

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

      const beat = getBeatIntensity();
      const attack = Math.min(1, beat * 2.2);
      smoothedIntensity = Math.max(attack, smoothedIntensity * 0.94);
      const shaderIntensity = Math.min(1, Math.pow(smoothedIntensity, 0.65));
      if (glitchPass) {
        glitchPass.uniforms.uIntensity!.value = shaderIntensity;
        glitchPass.uniforms.uTime!.value = now * 0.001;
      }

      /** アニメーションの更新 */
      getMixer()?.update(delta);
      getVrm()?.update(delta);
      composer.render();
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
    // Register the observer
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
    composer?.dispose();
    renderer?.dispose();
  });

  // カメラを外に出さないと、外からズームもリセットもできない。仕方ない。 -- IGNORE
  // If we don't expose the camera, nobody outside can zoom or reset it. What a drag. -- IGNORE
  return { getCamera: () => camera };
}

// こういう風に VRM の更新とアニメーションミキサーの更新を外部から呼び出せるようにしておくと、シーンのセットアップとアニメーションの管理が分離されて便利である。 -- IGNORE
// まぁ、再利用しやすい形にはしておいたけど、このプロジェクトでは VRM のアニメーションは一種類しか使わない予定なので、そこまで厳密に分ける必要もなかったかもしれない。 -- IGNORE
//
// そうだ、京都へ行こう‥ --- IGNORE ---

// Making it possible to call VRM updates and animation mixer updates externally like this is convenient because it separates scene setup and animation management. -- IGNORE
// Well, I made it in a form that's easy to reuse, but since this project only plans to use one type of VRM animation, it might not have been necessary to separate them so strictly. -- IGNORE
//
// Click your heels and think of Kansas.. --- IGNORE ---
