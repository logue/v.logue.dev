/** 音楽からビートを取得するクラス */
export class AudioManager {
  private readonly ctx: AudioContext;
  private source?: AudioBufferSourceNode;
  private readonly analyser: AnalyserNode;
  private hasStarted = false;
  private pendingStart = false;

  constructor() {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048; // 周波数解像度を上げて正確な帯域検出を実現
    this.setupAudioContextUnlock();
  }

  /**
   * iOS/Safari を含むブラウザ向けに、ユーザー操作で AudioContext を確実に有効化する
   */
  private setupAudioContextUnlock() {
    const initAudioContext = async () => {
      console.log('📻️ Attempting to unlock AudioContext...');
      try {
        if (this.ctx.state !== 'running') {
          await this.ctx.resume();
        }

        // sf2synth.js と同様の wake-up 処理
        const emptySource = this.ctx.createBufferSource();
        emptySource.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
        emptySource.connect(this.ctx.destination);
        emptySource.start(0);
        emptySource.stop(0);
        emptySource.disconnect();

        if (this.pendingStart && !this.hasStarted && this.source) {
          this.source.start(0);
          this.hasStarted = true;
          this.pendingStart = false;
        }
      } catch (e) {
        console.warn('❌️ AudioContext unlock failed:', e);
      }
    };

    document.addEventListener('touchstart', initAudioContext, { once: true, passive: true });
    document.addEventListener('pointerdown', initAudioContext, { once: true, passive: true });
    document.addEventListener('mousedown', initAudioContext, { once: true, passive: true });
    document.addEventListener('keydown', initAudioContext, { once: true });
  }

  /**
   * 初期化
   * @param buffer ループさせたい音源のArrayBuffer
   */
  public async init(buffer: ArrayBuffer) {
    const audioBuffer = await this.ctx.decodeAudioData(buffer);

    this.source = this.ctx.createBufferSource();
    this.source.buffer = audioBuffer;
    this.source.loop = true; // ogg(loop) なのでシームレスに回る
    this.hasStarted = false;
    this.pendingStart = false;

    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  /**
   * 音楽を再生する
   */
  public start() {
    if (!this.source || this.hasStarted) return;

    this.pendingStart = true;

    if (this.ctx.state === 'running') {
      this.source.start(0);
      this.hasStarted = true;
      this.pendingStart = false;
    }

    // ユーザー操作前は autoplay 制限で拒否されるため、gesture 後の unlock 処理に委ねる
  }

  /**
   * ビート（スネア）の強さを取得してグリッチに回す
   */
  public getBeatIntensity() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);

    /**
     * PAZ Analyzer の結果に基づくインデックス計算:
     * fftSize: 2048 の場合、1インデックスあたり約21.5Hz。
     * サンプリングレート 48000Hz ÷ 2048 = 23.4375Hz/bin
     * 250Hz  ≒ インデックス 11
     * 2000Hz ≒ インデックス 85
     */
    let snarePower = 0;
    const startBin = 11; // 250Hz付近から
    const endBin = 80; // 1.7kHz付近まで（ハイハット混入を避けるため）

    for (let i = startBin; i < endBin; i++) {
      snarePower += data[i]!;
    }

    // 平均値の算出 (0.0 - 1.0)
    const average = snarePower / (endBin - startBin) / 255;

    /**
     * ゲート処理: 常に鳴っているベースやバックグラウンドノイズを切り捨てる。
     * 現代的な楽曲（ストリーミング最適化で音圧が高い）では、
     * さらに低いしきい値（0.25～0.35）が適切。
     */
    const gateThreshold = 0.35; // 調整済み: より低い閾値で瞬間的なピークを捉える
    let intensity = 0;

    if (average > gateThreshold) {
      // しきい値を超えた分だけを 0.0 - 1.0 に再マッピング
      intensity = (average - gateThreshold) / (1 - gateThreshold);
    }

    // Rubicon 的なキレを出すための指数関数。
    // 4乗にすると、スネアの頂点(Peak)の瞬間だけ「バキッ」と反応します。
    const result = Math.pow(intensity, 4);

    // デバッグ用ログ (console は production build で削除される)
    if (import.meta.env.DEV && result > 0.01) {
      console.debug(
        `[AudioManager] snare avg=${average.toFixed(3)}, intensity=${result.toFixed(3)}`
      );
    }

    return result;
  }
}

// ふむ。Reverb.js を作ったときの経験が役立ったみたいだ。 --- IGNORE ---
// Hmm. Seems like the experience from creating Reverb.js was helpful. --- IGNORE ---
// <https://npmjs.com/package/@logue/reverb>
