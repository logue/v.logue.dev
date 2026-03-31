uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uIntensity; // 250Hz スネア
varying vec2 vUv;

// ykob氏のコードから拝借した強力なランダム関数
float random(vec2 c) {
  return fract(sin(dot(c.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// 色収差ノイズとブロックノイズを組み合わせたシェーダー
// Color Shift + Block Noise Shader
void main() {
  vec2 uv = vUv;
  float time = uTime;

  // スネアの瞬間にノイズの「激しさ」をブーストする
  // 0.8秒の余韻を残さず、スネアの瞬間にだけ「バキッ」とさせる
  float strength = pow(uIntensity, 3.0); 

  // 1. ブロックノイズの計算
  // スネアの音圧が高いときだけ、UV座標を大きく「断片化」させる
  if(strength > 0.1) {
    float blockCount = 10.0; // ブロックの数。Rubiconっぽくするなら 10〜20
    vec2 block = floor(uv * blockCount);
    uv += (random(block + time) - 0.5) * strength * 0.1;
  }

  // 2. RGB Shift (色収差)
  // インディゴの髪が、スネアに合わせて RGB に分解される
  float shift = strength * 0.5;
  vec4 texR = texture2D(tDiffuse, uv + vec2(shift, 0.0));
  vec4 texG = texture2D(tDiffuse, uv);
  vec4 texB = texture2D(tDiffuse, uv - vec2(shift, 0.0));

  vec3 color = vec3(texR.r, texG.g, texB.b);

  // 3. 輝度のブースト (Rubicon 的な発光)
  color += strength * 0.3;

  // 最後に元画像のアルファを維持する
  gl_FragColor = vec4(color, texG.a);
}