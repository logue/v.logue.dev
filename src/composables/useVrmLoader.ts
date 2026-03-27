import { type Ref } from 'vue';

import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import { unzipSync } from 'fflate';
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader, type GLTFParser, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
// だから、なんでTypescriptの型定義がこういうところまでカバーしてないんだろうか。 -- IGNORE
// So, why don't the TypeScript type definitions cover even these parts? -- IGNORE

/**
 * ArrayBuffer から VRM をパース・VRMA ZIP からアニメーションをセットアップする。
 * ネットワーク通信は一切しない。全部 PageCover が済ませてから渡してくれ。
 * Parse VRM from ArrayBuffer and set up animation from VRMA ZIP.
 * No network calls here. PageCover handles all that, then hands it over.
 *
 * @param vrma_file ZIP 内の VRMA ファイルパス
 * @param pivot VRM モデルを追加する Three.js オブジェクト
 * @param isLoading ロード中フラグ
 */
export function useVrmLoader(
  vrma_file: string,
  pivot: THREE.Object3D,
  isLoading: Ref<boolean>
): {
  vrm: { value: VRM | null };
  mixer: { value: THREE.AnimationMixer | null };
  load: (vrmUrl: string, vrmaZipBuffer: ArrayBuffer, vrmaFile?: string) => Promise<void>;
  changeAnimation: (vrmaZipBuffer: ArrayBuffer, vrmaFile?: string) => Promise<void>;
} {
  const vrm: { value: VRM | null } = { value: null };
  const mixer: { value: THREE.AnimationMixer | null } = { value: null };

  // nullはあまり好きじゃないんだけど、VRMモデルはロード前は存在しないので、こうするしかない。 -- IGNORE
  // undefinedにするのもありだけど、Vueのリアクティブシステムとの相性を考えると、nullの方が扱いやすいと思う。 -- IGNORE
  // I don't really like null, but since the VRM model doesn't exist before loading, this is the only way. -- IGNORE
  // undefined is also an option, but considering compatibility with Vue's reactive system, I think null is easier to handle. -- IGNORE

  // GLTFLoader はアニメーション変更時も使い回すためスコープに引き上げる
  const loader = new GLTFLoader();
  loader.register((parser: GLTFParser) => new VRMLoaderPlugin(parser));
  loader.register((parser: GLTFParser) => new VRMAnimationLoaderPlugin(parser));

  /**
   * ZIP バッファから VRMA を取り出してアニメーションをセットアップする。
   * ネットワーク不要。バッファだけ渡せばいい。
   * Extracts VRMA from ZIP buffer and sets up animation. No network needed. Just hand over the buffer.
   *
   * @param loadedVrm ロード済み VRM モデル
   * @param loader GLTFLoader インスタンス
   * @param vrmaZipBuffer VRMA ZIP の ArrayBuffer
   * @param vrmaFileName ZIP 内のターゲットファイルパス
   */
  async function setupAnimation(
    loadedVrm: VRM,
    loader: GLTFLoader,
    vrmaZipBuffer: ArrayBuffer,
    vrmaFileName: string
  ): Promise<THREE.AnimationMixer | null> {
    console.log('Setting up VRM animation...');
    // ZIP をメモリ内で展開して VRMA を取り出す。fetchは不要。 -- IGNORE
    // Decompress ZIP in memory and extract VRMA. No fetch needed. -- IGNORE
    const unzipped = unzipSync(new Uint8Array(vrmaZipBuffer));

    if (!Object.hasOwn(unzipped, vrmaFileName)) {
      throw new Error(`File ${vrmaFileName} not found in ZIP`);
    }
    // eslint-disable-next-line security/detect-object-injection
    const motionData: Uint8Array | undefined = unzipped[vrmaFileName];
    if (!motionData) throw new Error(`File ${vrmaFileName} not found in ZIP`);

    const vrmaBuffer = motionData.slice().buffer;

    // VRMAファイルをBlobに変換してURLを作成し、GLTFLoaderでロードする。 -- IGNORE
    // Convert the VRMA file to a Blob, create a URL, and load it with GLTFLoader. -- IGNORE
    const vrmaBlob = new Blob([vrmaBuffer], { type: 'application/octet-stream' });
    const vrmaUrl = URL.createObjectURL(vrmaBlob);

    const vrmaGltf = (await loader.loadAsync(vrmaUrl)) as GLTF;
    console.log('VRMA loaded and parsed:', vrmaGltf);

    const vrmAnimations = vrmaGltf.userData.vrmAnimations;
    if (vrmAnimations && vrmAnimations.length > 0) {
      const clip = createVRMAnimationClip(vrmAnimations[0], loadedVrm);
      const animMixer = new THREE.AnimationMixer(loadedVrm.scene);
      animMixer.clipAction(clip).play();
      URL.revokeObjectURL(vrmaUrl);
      return animMixer;
    }
    return null;
  }

  /**
   * VRM URL を GLTFLoader に渡してモデルをロードする。
   * loadAsync を使えばコールバック地獄とはおさらばできる。文明の進歩に感謝しろ。
   * Loads the VRM model by passing the URL to GLTFLoader.
   * Using loadAsync means we can say goodbye to callback hell. Thank civilization.
   *
   * @param vrmUrl VRM ファイルのダウンロード URL
   * @param vrmaZipBuffer VRMA ZIP の ArrayBuffer
   * @param vrmaFile ZIP 内の VRMA ファイルパス（省略時はコンストラクタの vrma_file を使う）
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
      isLoading.value = false;
      return;
    }

    // 知ってた？ VRM モデルは glTF のサブセットで、中身は JSON なんだぜ。 -- IGNORE
    // Did you know? The VRM model is a subset of glTF, and its contents are JSON. -- IGNORE
    const loadedVrm: VRM = gltf.userData.vrm;
    if (!loadedVrm) {
      console.error('VRM not found in gltf.userData.vrm');
      isLoading.value = false;
      return;
    }

    pivot.add(loadedVrm.scene);
    vrm.value = loadedVrm;

    // VRM ロード完了後にデフォルトアニメーションを自動起動する
    setupAnimation(loadedVrm, loader, vrmaZipBuffer, vrmaFile ?? vrma_file)
      .then(m => {
        mixer.value = m ?? null;
      })
      .catch(console.error);

    isLoading.value = false;
    console.log('ELF_LOADED');
  }

  /**
   * アニメーションを切り替える。既存のアクションを止めて新しい VRMA に差し替える。
   * VRM がロードされていなければ何もしない（当たり前だ）。
   * Switches animation. Stops existing actions and replaces with new VRMA.
   * Does nothing if VRM isn't loaded yet (obviously).
   *
   * @param vrmaZipBuffer 新しい VRMA が入った ZIP の ArrayBuffer
   * @param vrmaFile ZIP 内のパス（省略時はコンストラクタの vrma_file を使う）
   */
  async function changeAnimation(vrmaZipBuffer: ArrayBuffer, vrmaFile?: string): Promise<void> {
    if (!vrm.value) {
      console.warn('VRM not loaded yet. Call load() first.');
      return;
    }
    mixer.value?.stopAllAction();
    mixer.value = null;

    const newMixer = await setupAnimation(vrm.value, loader, vrmaZipBuffer, vrmaFile ?? vrma_file);
    mixer.value = newMixer ?? null;
  }

  return { vrm, mixer, load, changeAnimation };
}

// よう、ジャリン子供。楽しんでいるかい？
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
// ライセンスは守ろうね。 -- IGNORE

// Hi kids. I hope you're having fun.
// Important safety tip:
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
// Let's respect licenses. -- IGNORE
