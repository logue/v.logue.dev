import { shallowRef, type ShallowRef } from 'vue';

import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader, type GLTFParser, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
// だから、なんでTypescriptの型定義がこういうところまでカバーしてないんだろうか。 -- IGNORE
// So, why don't the TypeScript type definitions cover even these parts? -- IGNORE

import { extractFromZip } from '@/services/assetLoader';

/**
 * ホワイトリスト：.vrma ファイルのみ許可。ディレクトリトラバーサル防止。
 * 許可: サブディレクトリ内のファイル (例: VRMA_MotionPack/vrma/VRMA_01.vrma)
 * Allowlist: Only .vrma files. Prevents directory traversal.
 * Allowed: Files in subdirectories (e.g., VRMA_MotionPack/vrma/VRMA_01.vrma)
 */
const VRMA_FILE_PATTERN = /^(?!.*\.\.)[\w()\s/.-]+\.vrma$/i;

export interface UseVrmLoaderReturn {
  /** ロード済み VRM。ロード前は null / Loaded VRM, null before loading */
  vrm: Readonly<ShallowRef<VRM | null>>;
  /** アニメーションミキサー。アニメーション未設定時は null / Animation mixer, null when no animation is set */
  mixer: Readonly<ShallowRef<THREE.AnimationMixer | null>>;
  /** VRM をロードしてデフォルトアニメーションを再生する / Load the VRM and play the default animation */
  load: (vrmUrl: string, vrmaZipBuffer: ArrayBuffer, vrmaFile?: string) => Promise<void>;
  /** アニメーションを切り替える / Switch animation */
  changeAnimation: (vrmaZipBuffer: ArrayBuffer, vrmaFile?: string) => Promise<void>;
}

/**
 * ArrayBuffer から VRM をパース・VRMA ZIP からアニメーションをセットアップする。
 * VRM 本体の URL 解決とファイル取得は呼び出し側（VrmCanvas）の仕事。
 * Parse VRM and set up animation from a VRMA ZIP.
 * Resolving the VRM URL and fetching files is the caller's (VrmCanvas) job.
 *
 * @param defaultVrmaFile ZIP 内の VRMA ファイルパス（省略時のデフォルト）
 * @param pivot VRM モデルを追加する Three.js オブジェクト
 */
export function useVrmLoader(defaultVrmaFile: string, pivot: THREE.Object3D): UseVrmLoaderReturn {
  // Three.js のオブジェクトは Vue にプロキシさせたくないので shallowRef。 -- IGNORE
  // shallowRef so Vue never proxies Three.js internals. -- IGNORE
  const vrm = shallowRef<VRM | null>(null);
  const mixer = shallowRef<THREE.AnimationMixer | null>(null);

  // GLTFLoader はアニメーション変更時も使い回す
  // GLTFLoader is reused when switching animations
  const loader = new GLTFLoader();
  loader.register((parser: GLTFParser) => new VRMLoaderPlugin(parser));
  loader.register((parser: GLTFParser) => new VRMAnimationLoaderPlugin(parser));

  /**
   * ZIP バッファから VRMA を取り出してアニメーションをセットアップする。
   * ネットワーク不要。バッファだけ渡せばいい。
   * Extracts VRMA from ZIP buffer and sets up animation. No network needed. Just hand over the buffer.
   *
   * @param loadedVrm ロード済み VRM モデル
   * @param vrmaZipBuffer VRMA ZIP の ArrayBuffer
   * @param vrmaFileName ZIP 内のターゲットファイルパス
   */
  async function setupAnimation(
    loadedVrm: VRM,
    vrmaZipBuffer: ArrayBuffer,
    vrmaFileName: string
  ): Promise<THREE.AnimationMixer | null> {
    if (!VRMA_FILE_PATTERN.test(vrmaFileName)) {
      throw new Error(
        `Invalid VRMA file name: ${vrmaFileName}. Must be a .vrma file. Directory traversal (..) not allowed.`
      );
    }

    // ZIP をメモリ内で展開して VRMA を取り出す。fetchは不要。 -- IGNORE
    // Decompress ZIP in memory and extract VRMA. No fetch needed. -- IGNORE
    const vrmaBuffer = extractFromZip(vrmaZipBuffer, vrmaFileName);

    // VRMAファイルをBlobに変換してURLを作成し、GLTFLoaderでロードする。 -- IGNORE
    // Convert the VRMA file to a Blob, create a URL, and load it with GLTFLoader. -- IGNORE
    const vrmaUrl = URL.createObjectURL(
      new Blob([vrmaBuffer], { type: 'application/octet-stream' })
    );

    try {
      const vrmaGltf = (await loader.loadAsync(vrmaUrl)) as GLTF;
      const vrmAnimations = vrmaGltf.userData.vrmAnimations;
      if (!vrmAnimations || vrmAnimations.length === 0) return null;

      const clip = createVRMAnimationClip(vrmAnimations[0], loadedVrm);
      const animMixer = new THREE.AnimationMixer(loadedVrm.scene);
      animMixer.clipAction(clip).play();
      return animMixer;
    } finally {
      URL.revokeObjectURL(vrmaUrl);
    }
  }

  /**
   * VRM URL を GLTFLoader に渡してモデルをロードする。
   * loadAsync を使えばコールバック地獄とはおさらばできる。文明の進歩に感謝しろ。
   * Loads the VRM model by passing the URL to GLTFLoader.
   * Using loadAsync means we can say goodbye to callback hell. Thank civilization.
   *
   * @param vrmUrl VRM ファイルのダウンロード URL
   * @param vrmaZipBuffer VRMA ZIP の ArrayBuffer
   * @param vrmaFile ZIP 内の VRMA ファイルパス（省略時は defaultVrmaFile を使う）
   */
  async function load(
    vrmUrl: string,
    vrmaZipBuffer: ArrayBuffer,
    vrmaFile?: string
  ): Promise<void> {
    let gltf: GLTF;
    try {
      gltf = (await loader.loadAsync(vrmUrl)) as GLTF;
    } catch (e) {
      console.error('[useVrmLoader] loadAsync failed:', e);
      return;
    }

    // 知ってた？ VRM モデルは glTF のサブセットで、中身は JSON なんだぜ。 -- IGNORE
    // Did you know? The VRM model is a subset of glTF, and its contents are JSON. -- IGNORE
    const loadedVrm: VRM | undefined = gltf.userData.vrm;
    if (!loadedVrm) {
      console.error('VRM not found in gltf.userData.vrm');
      return;
    }

    pivot.add(loadedVrm.scene);
    vrm.value = loadedVrm;

    // VRM ロード完了後にデフォルトアニメーションを自動起動する（モデル表示は待たせない）
    // Start the default animation after the VRM loads (without blocking the model display)
    setupAnimation(loadedVrm, vrmaZipBuffer, vrmaFile ?? defaultVrmaFile)
      .then(m => {
        mixer.value = m;
      })
      .catch(console.error);
  }

  /**
   * アニメーションを切り替える。既存のアクションを止めて新しい VRMA に差し替える。
   * VRM がロードされていなければ何もしない（当たり前だ）。
   * Switches animation. Stops existing actions and replaces with new VRMA.
   * Does nothing if VRM isn't loaded yet (obviously).
   *
   * @param vrmaZipBuffer 新しい VRMA が入った ZIP の ArrayBuffer
   * @param vrmaFile ZIP 内のパス（省略時は defaultVrmaFile を使う）
   */
  async function changeAnimation(vrmaZipBuffer: ArrayBuffer, vrmaFile?: string): Promise<void> {
    if (!vrm.value) {
      console.warn('VRM not loaded yet. Call load() first.');
      return;
    }
    mixer.value?.stopAllAction();
    mixer.value = null;
    mixer.value = await setupAnimation(vrm.value, vrmaZipBuffer, vrmaFile ?? defaultVrmaFile);
  }

  return { vrm, mixer, load, changeAnimation };
}

// よう、ジャリン子ども。楽しんでいるかい？
// 大事なことを教えてやろう：
// アニメーションの Zip ファイルは、https://vroid.booth.pm/items/5512385 からダウンロードした Zip ファイルをそのまま使用しているが、
// ライセンスの禁止事項に「本モーション、またはその改変作品を許可なく取り出せる状態で二次配布すること。」と明言されているので
// 直接ファイルをプロジェクトに含めるのではなく、 CloudFlare R2 で構築したアセットサーバーにアップロードして Worker を用いてそこからフェッチする形にしている。 -- IGNORE
// なお、Worker はブラウザのコンソールログに通信情報などが出ないので、上記ライセンスに抵触することなくファイルを呼び出せる。 -- IGNORE
// 仕組みとしては VRM モデルを Vroid Hub から取得する処理を、自前のアセットサーバーで行っているということ一緒。 -- IGNORE
// くわしくは、functions/assets/[[path]].ts を見てほしい。 -- IGNORE
// 使い方？このプロジェクトを生成 AI に読ませれば教えてくれるだろう。
// エディタの右のチャット欄に「このコードは何を意図しているのか？」ってプロンプトに打ち込むぐらいのことはできるよな？ -- IGNORE
//
// ちなみに、生成 AI はこういうライセンスの話はしてくれないことが多いので、開発者が自分で考えて実装する必要がある。 -- IGNORE
// くれぐれも、ライセンスは守るんだぞ。 -- IGNORE

// Hi kids. I hope you're having fun.
// Important safety tip：
// The animation zip file is used as is from the zip file downloaded from https://vroid.booth.pm/items/5512385,
// but since the license explicitly states in the prohibitions that "Redistributing the motion or its derivative works in a state where it can be extracted without permission." is prohibited,
// instead of directly including the file in the project, it is uploaded to an asset server built with CloudFlare R2 and fetched from there using a Worker. -- IGNORE
// Note that since the Worker does not output communication information to the browser's console log, the file can be called without violating the above license. -- IGNORE
// The mechanism is that the process of obtaining the VRM model from Vroid Hub is done on our own asset server. -- IGNORE
// For details, please see functions/assets/[[path]].ts. -- IGNORE
// Usage? If you let the generative AI read this project, it will tell you.
// You can at least type "What is the intention of this code?" in the chat column on the right side of your editor, right? -- IGNORE
//
// By the way, generation AI often doesn't talk about these kinds of licensing issues, so developers need to think about it and implement it themselves. -- IGNORE
// You must follow the license, okay? -- IGNORE
