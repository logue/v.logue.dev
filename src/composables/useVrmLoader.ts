import { type Ref } from 'vue';

import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader, type GLTFParser, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
// だから、なんでTypescriptの型定義がこういうところまでカバーしてないんだろうか。 -- IGNORE
// So, why don't the TypeScript type definitions cover even these parts? -- IGNORE

import { useMotionLoader } from './useMotionLoader';

/**
 * VRM URLフェッチ・GLTFロード・VRMA アニメーションセットアップ
 * @param api APIエンドポイント（例: '/api/vrm'）からVRMモデルのURLを取得するための文字列
 * @param zip アセットサーバーのzipファイルのパス
 * @param vrma VRMAファイルのパス（zip内のパス）
 * @param pivot VRMモデルを追加するためのThree.jsオブジェクト
 * @param isLoading ロード中かどうかを示すRef<boolean>
 * @returns VRMモデル、アニメーションミキサー、ロード関数を返すオブジェクト
 *  - vrm: ロードされたVRMモデル（初期値はnull）
 *  - mixer: VRMアニメーション用のAnimationMixer（初期値はnull）
 *  - load: VRMモデルをロードしてシーンに追加する非同期関数
 */
export function useVrmLoader(
  api: string,
  vrma_zip: string = 'VRMA_MotionPack.zip',
  vrma_file: string = 'VRMA_MotionPack/vrma/VRMA_01.vrma',
  pivot: THREE.Object3D,
  isLoading: Ref<boolean>
): {
  vrm: { value: VRM | null };
  mixer: { value: THREE.AnimationMixer | null };
  load: () => Promise<void>;
  changeAnimation: (zip: string, vrma: string) => Promise<void>;
} {
  const vrm: { value: VRM | null } = { value: null };
  const mixer: { value: THREE.AnimationMixer | null } = { value: null };

  // nullはあまり好きじゃないんだけど、VRMモデルはロード前は存在しないので、こうするしかない。 -- IGNORE
  // undefinedにするのもありだけど、Vueのリアクティブシステムとの相性を考えると、nullの方が扱いやすいと思う。 -- IGNORE
  // I don't really like null, but since the VRM model doesn't exist before loading, this is the only way. -- IGNORE
  // undefined is also an option, but considering compatibility with Vue's reactive system, I think null is easier to handle. -- IGNORE
  const { decompressMotion } = useMotionLoader();

  // GLTFLoader はアニメーション変更時も使い回すためスコープに引き上げる
  const loader = new GLTFLoader();
  loader.register((parser: GLTFParser) => new VRMLoaderPlugin(parser));
  loader.register((parser: GLTFParser) => new VRMAnimationLoaderPlugin(parser));

  /**
   * VRM にアニメーションをセットアップする関数
   * @param loadedVrm ロードされたVRMモデル
   * @param loader GLTFLoaderインスタンス
   * @param zip アセットサーバーのzipファイルのパス
   * @param vrma VRMAファイルのパス（zip内のパス）
   * @returns アニメーションミキサー
   */
  async function setupAnimation(
    loadedVrm: VRM,
    loader: GLTFLoader,
    zip: string,
    vrma: string
  ): Promise<THREE.AnimationMixer | null> {
    console.log('Setting up VRM animation...');
    // VRMA モーションパックのロードとアニメーションミキサーのセットアップ -- IGNORE
    // まず、VRMAの入ったZiopファイルを解凍してVRMAファイルを取り出す。 -- IGNORE
    // Load the VRMA motion pack and set up the animation mixer -- IGNORE
    // First, unzip the Zip file containing the VRMA and extract the VRMA file. -- IGNORE
    const vrmaBuffer = await decompressMotion(zip, vrma);

    // VRMAファイルをBlobに変換してURLを作成し、GLTFLoaderでロードする。 -- IGNORE
    // Convert the VRMA file to a Blob, create a URL, and load it with GLTFLoader. -- IGNORE
    const vrmaBlob = new Blob([vrmaBuffer], { type: 'application/octet-stream' });
    const vrmaUrl = URL.createObjectURL(vrmaBlob);

    const vrmaGltf = await loader.loadAsync(vrmaUrl);
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
   * VRMモデルをロードしてシーンに追加する関数
   * @returns
   */
  async function load() {
    let url: string;
    try {
      const res = await fetch(api);
      if (!res.ok) {
        const body = await res.text();
        console.error('Failed to fetch VRM URL:', res.status, body);
        isLoading.value = false;
        return;
      }
      const data: { url: string } = await res.json();
      url = data.url;
      console.log('VRM_URL_RECEIVED:', url);
    } catch (e) {
      console.error('fetch /api/vrm threw an exception:', e);
      isLoading.value = false;
      return;
    }

    // GLTFLoaderを使用してVRMモデルをロードする。 -- IGNORE
    // Load the VRM model using GLTFLoader. -- IGNORE
    loader.load(
      url,
      (gltf: GLTF) => {
        // ロードが完了されたらコールバックが呼ばれるので、VRMモデルをシーンに追加してアニメーションをセットアップする。 -- IGNORE
        // When loading is complete, the callback is called, so add the VRM model to the scene and set up the animation. -- IGNORE
        const loadedVrm: VRM = gltf.userData.vrm;
        // 知ってた？ VRM モデルは glTF のサブセットで、中身は JSON なんだぜ。 -- IGNORE
        // もっとも、画像などのバイナリデータ BSON ではなくどちらかというと DDS に近いが。 -- IGNORE
        // Did you know? The VRM model is a subset of glTF, and its contents are JSON. -- IGNORE
        // However, binary data such as images is closer to DDS rather than BSON. -- IGNORE

        if (!loadedVrm) {
          console.error('VRM not found in gltf.userData.vrm');
          return;
        }
        pivot.add(loadedVrm.scene);
        vrm.value = loadedVrm;

        // それにしても、この API はなんで async/await に対応してないんだろうか。 -- IGNORE
        // By the way, why doesn't this API support async/await? -- IGNORE

        // VRM ロード完了後にデフォルトアニメーションを自動起動する
        setupAnimation(loadedVrm, loader, vrma_zip, vrma_file)
          .then(m => {
            mixer.value = m ?? null;
          })
          .catch(console.error);

        isLoading.value = false;
        console.log('ELF_LOADED');
      },
      (progress: ProgressEvent) =>
        // ま、進捗APIはあるだけマシだと思うことにしよう。 -- IGNORE
        // 問題は、セキュリティの都合上、それをUIに反映させる仕組みがないことなんだよな。 -- IGNORE
        // Well, let's just be grateful that there is a progress API. -- IGNORE
        // The problem is that, for security reasons, there is no mechanism to reflect it in the UI. -- IGNORE
        console.log(`Loading VRM: ${Math.round((progress.loaded / progress.total) * 100)}%`),
      (error: unknown) => console.error('GLTFLoader error:', error)
    );
  }

  /**
   * アニメーションを適用・変更する関数
   * 既存のアニメーションを停止し、指定した VRMA に切り替える。
   * VRM がロードされていない場合は何もしない。
   * @param zip アセットサーバーの Zip ファイルのパス
   * @param vrma Zip 内の VRMA ファイルのパス
   */
  async function changeAnimation(zip: string, vrma: string): Promise<void> {
    if (!vrm.value) {
      console.warn('VRM not loaded yet. Call load() first.');
      return;
    }
    mixer.value?.stopAllAction();
    mixer.value = null;

    const newMixer = await setupAnimation(vrm.value, loader, zip, vrma);
    mixer.value = newMixer ?? null;
  }

  return { vrm, mixer, load, changeAnimation };
}

// よう
// 大事なことを教えてやろう：
// アニメーションの Zip ファイルは、https://vroid.booth.pm/items/5512385 からダウンロードした Zip ファイルをそのまま使用しているが、
// ライセンスの禁止事項に「本モーション、またはその改変作品を許可なく取り出せる状態で二次配布すること。」と明言されているので
// 直接ファイルをプロジェクトに含めるのではなく、 CloudFlare R2 で構築したアセットサーバーにアップロードして Worker を用いてそこからフェッチする形にしている。 -- IGNORE
// なお、Worker はブラウザのコンソールログに通信情報などが出ないので、上記ライセンスに抵触することなくファイルを呼び出せる。 -- IGNORE
// 仕組みとしては VRM モデルを Vroid Hub から取得する処理を、自前のアセットサーバーで行っているということ一緒。 -- IGNORE
// くわしくは、functions/assets/[[path]].ts を見てほしい。 -- IGNORE
// 使い方？このソースコードを AI に読ませれば教えてくれるっしょ。エディタの右のチャットに「何を意図しているのか？」ってプロンプトに打ち込むぐらいのことはできるよな？ -- IGNORE
//
// ちなみに、生成 AI はこういうライセンスの話はしてくれないことが多いので、開発者が自分で考えて実装する必要がある。 -- IGNORE
// ライセンスは守ろうね。 -- IGNORE

// Hi kids.  I hope you're having fun.
// Important safety tip:
// The animation zip file is used as is from the zip file downloaded from https://vroid.booth.pm/items/5512385,
// but since the license explicitly states in the prohibitions that "Redistributing the motion or its derivative works in a state where it can be extracted without permission." is prohibited,
// instead of directly including the file in the project, it is uploaded to an asset server built with CloudFlare R2 and fetched from there using a Worker. -- IGNORE
// Note that since the Worker does not output communication information to the browser's console log, the file can be called without violating the above license. -- IGNORE
// The mechanism is that the process of obtaining the VRM model from Vroid Hub is done on our own asset server. -- IGNORE
// For details, please see functions/assets/[[path]].ts. -- IGNORE
// How to use? If you let AI read this source code, it will tell you. You can at least type "What are you trying to do?" in the prompt, right? -- IGNORE
//
// By the way, generation AI often doesn't talk about these kinds of licensing issues, so developers need to think about it and implement it themselves. -- IGNORE
// Let's respect licenses. -- IGNORE
