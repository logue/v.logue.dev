uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uIntensity;
uniform vec2 uResolution;
varying vec2 vUv;

// 擬似ランダム
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;

  // 1. ブロック・ディスプレイスメント (矩形領域のワープ)
  // 強度が高い時だけ、画面を粗いグリッドに分割してX方向にずらす
  if(uIntensity > 0.2) {
    float grid = 12.0;
    vec2 blockUv = floor(uv * grid) / grid;
    float noise = rand(blockUv + floor(uTime * 15.0));

    if(noise < uIntensity * 0.4) {
      uv.x += (rand(vec2(blockUv.y, uTime)) - 0.5) * 0.1 * uIntensity;
    }
  }

  vec4 color = texture2D(tDiffuse, uv);

  // 2. デジタル・カラー・ノイズ (ビット化けのような色の反転)
  // 特定の矩形ブロックだけ色を反転させたり、輝度を変えたりする
  if(uIntensity > 0.5) {
    float grid2 = 30.0;
    vec2 blockUv2 = floor(vUv * grid2) / grid2;
    float noise2 = rand(blockUv2 + uTime);

    if(noise2 < uIntensity * 0.2) {
      // 色反転 (データ破損の演出)
      color.rgb = 1.0 - color.rgb;
      // 少しだけ緑/紫に寄せる
      color.g += 0.2;
    }
  }

  // 3. 静的なホワイトノイズを薄く乗せる
  float sNoise = rand(vUv + uTime) * 0.05 * uIntensity;
  color.rgb += sNoise;

  gl_FragColor = color;
}