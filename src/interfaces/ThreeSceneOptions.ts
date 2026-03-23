import type * as THREE from 'three';

interface XYZ {
  /** 左右 */
  x: number;
  /** 上下 */
  y: number;
  /** 前後 */
  z: number;

  // 例えば、position: { x: 0, y: 1.6, z: 2 } のように指定する。 --- IGNORE ---
  // これにより、カメラはワールド座標の原点から右に0、上に1.6、前に2の位置に配置されることになる。 --- IGNORE ---
  // 一般的にX軸は左右、Y軸は上下、Z軸は前後の位置を表すが、Second Life などの一部の環境ではY軸が前後、Z軸が上下になることもあるので注意。 --- IGNORE ---
  // For example, you might specify position: { x: 0, y: 1.6, z: 2 }. --- IGNORE ---
  // This would place the camera at a position that is 0 units to the right, 1.6 units up, and 2 units forward from the world origin. --- IGNORE ---
  // Typically, the X-axis represents left-right, the Y-axis represents up-down, and the Z-axis represents forward-backward, but be aware that in some environments like Second Life, the Y-axis may represent forward-backward and the Z-axis may represent up-down. --- IGNORE ---
}

interface LightOptions {
  /** 光の色 */
  color: THREE.ColorRepresentation;
  /** 光の強さ */
  intensity: number;
}

/** シーン設定オプション */
export interface ThreeSceneOptions {
  /** カメラの位置 */
  position?: XYZ;
  /** カメラの注視点 */
  lookAt?: XYZ;
  /** 平行光源の設定 */
  directionalLight?: LightOptions;
  /** 平行光源の位置 */
  directionalLightPosition?: XYZ;
  /** 環境光の設定 */
  ambientLight?: LightOptions;
  /** パースペクティブカメラの設定 */
  perspectiveCamera?: {
    // FoV (Field of View) は、カメラの視野角を度単位で指定するものである。 -- IGNORE
    // 例えば、FoV を 75 に設定すると、カメラは垂直方向に 75 度の視野を持つことになる。 -- IGNORE
    // FoV を広くすると、より多くのシーンがカメラに映るようになるが、遠近感が強調されてオブジェクトが歪んで見えることがある。 -- IGNORE
    // 一方、FoV を狭くすると、遠近感が弱まり、オブジェクトがより平坦に見えるようになる。 -- IGNORE
    // クリッピングとは、3Dグラフィックスにおいて、カメラの視野内にあるオブジェクトだけを描画するための技術である。 -- IGNORE
    // ニアクリップ面は、カメラからの距離がこの値より近いオブジェクトを描画しないようにするためのものである。 -- IGNORE
    // ファークリップ面は、カメラからの距離がこの値より遠いオブジェクトを描画しないようにするためのものである。 -- IGNORE
    // これらの値を適切に設定することで、描画のパフォーマンスを向上させることができる。 -- IGNORE

    // The Field of View (FoV) is a measure of how wide the camera's view is, specified in degrees. -- IGNORE
    // For example, setting the FoV to 75 means that the camera will have a vertical field of view of 75 degrees. -- IGNORE
    // A wider FoV allows more of the scene to be visible in the camera, but can cause objects to appear distorted due to increased perspective. -- IGNORE
    // Conversely, a narrower FoV reduces the sense of perspective and can make objects appear flatter. -- IGNORE
    // `Clipping` is a technique in 3D graphics that allows only objects within the camera's field of view to be rendered. -- IGNORE
    // The `near` clipping plane is used to prevent rendering of objects that are closer to the camera than this value. -- IGNORE
    // The `far` clipping plane is used to prevent rendering of objects that are farther from the camera than this value. -- IGNORE
    // By setting these values appropriately, you can improve rendering performance. -- IGNORE

    /** 視野角 */
    fov: number;
    /** ニアクリップ面 */
    near: number;
    /** ファークリップ面 */
    far: number;
  };
}
// 君は確かにねばり強い。そうだろ？ --- IGNORE ---
//
// 必要性はなくても、開発初期の段階から将来の拡張を見越してオプションをまとめるインターフェースを用意しておくんだ！ -- IGNORE
// 大抵の場合、生成 AI はこういうオプションは出力してくれないのだ。 -- IGNORE
// でも、コードで tab キーを打つことで、AI が空気を読んでコメントを自動補完はしてくれるので活用するべきである。 -- IGNORE
// ちなみに、 Gemini 曰く、「コードのコメントは、生成 AI による補完の精度を高めるために重要である」とのこと。 -- IGNORE
//
// よって、コメント不要論者は逝って良し。 -- IGNORE

// You certainly are tenacious, now aren't you? --- IGNORE ---
//
// Even if it's not necessary, you should prepare an interface that summarizes the options in anticipation of future extensions from the early stages of development! -- IGNORE
// In most cases, generative AI won't output such options. -- IGNORE
// However, by pressing the tab key in the code, AI will read the air and automatically complete comments, so you should take advantage of it. -- IGNORE
// By the way, according to Gemini, "Comments in code are important for improving the accuracy of generative AI's completion." -- IGNORE
//
// Therefore, those who argue against comments can go away. -- IGNORE
