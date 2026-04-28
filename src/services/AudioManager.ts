/** 音楽からビートを取得するクラス / Class to extract beats from music */
export class AudioManager {
  private readonly ctx: AudioContext;
  private source?: AudioBufferSourceNode;
  private readonly analyser: AnalyserNode;
  private hasStarted = false;
  private pendingStart = false;
  private isPlayingState = false;

  constructor() {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    // 周波数解像度を上げて正確な帯域検出を実現
    // Increase frequency resolution for accurate band detection
    this.analyser.fftSize = 2048;
    this.setupAudioContextUnlock();
  }

  /**
   * iOS/Safari を含むブラウザ向けに、ユーザー操作で AudioContext を確実に有効化する
   * Unlock AudioContext for browsers including iOS/Safari with user interaction
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
          this.isPlayingState = true;
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
   * 初期化 / Initialize the audio manager with the given audio buffer.
   * @param buffer ループさせたい音源のArrayBuffer / ArrayBuffer of the audio source to loop
   */
  public async init(buffer: ArrayBuffer) {
    const audioBuffer = await this.ctx.decodeAudioData(buffer);

    this.source = this.ctx.createBufferSource();
    this.source.buffer = audioBuffer;
    this.source.loop = true;
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
      this.isPlayingState = true;
    }

    // ユーザー操作前は autoplay 制限で拒否されるため、gesture 後の unlock 処理に委ねる
    // It will be rejected due to autoplay restrictions before user interaction, so it will be left to the unlock process after the gesture.
  }

  /**
   * 再生を一時停止する
   * ユーザー操作前の autoplay 制限で start() が拒否された場合でも、ユーザー操作後の unlock 処理で正しく再生が開始されるようにするため、AudioContext の状態に関わらず pause() を呼び出せるようにしている。
   * Pause the playback.
   * To ensure that even if start() is rejected due to autoplay restrictions before user interaction, the correct playback will start after user interaction and unlock processing, we allow calling pause() regardless of the state of the AudioContext.
   */
  public async pause() {
    if (!this.source || !this.isPlayingState) return;

    try {
      await this.ctx.suspend();
      this.isPlayingState = false;
    } catch (e) {
      console.warn('❌️ AudioContext pause failed:', e);
    }
  }

  /**
   * 一時停止から再開する
   * ユーザー操作前の autoplay 制限で start() が拒否された場合でも、ユーザー操作後の unlock 処理で正しく再生が開始されるようにするため、AudioContext の状態に関わらず resume() を呼び出せるようにしている。
   * Resume from pause.
   * To ensure that even if start() is rejected due to autoplay restrictions before user interaction, the correct playback will start after user interaction and unlock processing, we allow calling resume() regardless of the state of the AudioContext.
   */
  public async resume() {
    if (!this.source || this.isPlayingState) return;

    try {
      await this.ctx.resume();
      this.isPlayingState = true;
    } catch (e) {
      console.warn('❌️ AudioContext resume failed:', e);
    }
  }

  /**
   * 再生中かどうかを取得する
   * Note: AudioContext の state を直接参照するのではなく、start/pause/resume メソッド内で状態を管理している。これは、ユーザー操作前の autoplay 制限で start() が拒否された場合でも、ユーザー操作後の unlock 処理で正しく再生が開始されるようにするため。
   * Detect if the audio is currently playing.
   * Note: Instead of directly referencing the state of the AudioContext, we manage the state within the start/pause/resume methods. This is to ensure that even if start() is rejected due to autoplay restrictions before user interaction, the correct playback will start after user interaction and unlock processing.
   */
  public get isPlaying() {
    return this.isPlayingState;
  }

  /**
   * ビート（スネア）の強さを取得してグリッチに回す
   * PAZ Analyzer のスネア帯域（250Hz～2000Hz）を合算して平均を取り、ゲート処理でノイズを切り捨てた後、マラソンルビコン的なキレを出すために指数関数で調整している。
   * Gets the beat (snare) intensity to feed into the glitch effect.
   * It sums the snare band (250Hz-2000Hz) of the PAZ Analyzer, averages it, applies gate processing to cut out noise, and then adjusts it with an exponential function for a Marathon Rubicon-like sharpness.
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
     *
     * Index calculation based on PAZ Analyzer results:
     * With fftSize of 2048, each index corresponds to about 21.5Hz.
     * Sampling rate 48000Hz ÷ 2048 = 23.4375Hz/bin
     * 250Hz  ≒ Index 11
     * 2000Hz ≒ Index 85
     */
    let snarePower = 0;
    // 250Hz付近から2000Hz付近までの帯域をスネアのエネルギーとして合算
    // Summing the energy in the band from around 250Hz to around 2000Hz as snare energy
    const startBin = 11;
    // 1.7kHz付近まで（ハイハット混入を避けるため）
    // Up to around 1.7kHz (to avoid hi-hat contamination)
    const endBin = 80;

    for (let i = startBin; i < endBin; i++) {
      // iは固定範囲ループ（startBin～endBin）内に制限されている。インデックス計算で検証済み。
      // i is constrained within a fixed range loop (startBin to endBin). Validated in index calculation.
      // eslint-disable-next-line security/detect-object-injection -- array index from static range loop
      snarePower += data[i]!;
    }

    // 平均値の算出 (0.0 - 1.0)
    // Calculate the average (0.0 - 1.0)
    const average = snarePower / (endBin - startBin) / 255;

    /**
     * ゲート処理: 常に鳴っているベースやバックグラウンドノイズを切り捨てる。
     * 現代的な楽曲（ストリーミング最適化で音圧が高い）では、
     * さらに低いしきい値（0.25～0.35）が適切。
     *
     * Gate processing: Cuts out constant bass and background noise.
     * For modern tracks (with high loudness due to streaming optimization),
     * a lower threshold (0.25-0.35) is more appropriate.
     */
    const gateThreshold = 0.35;
    let intensity = 0;

    if (average > gateThreshold) {
      // しきい値を超えた分だけを 0.0 - 1.0 に再マッピング
      // Remap the amount above the threshold to 0.0 - 1.0
      intensity = (average - gateThreshold) / (1 - gateThreshold);
    }

    // Marathon Rubicon 的なキレを出すための指数関数。
    // 4乗にすると、スネアの頂点(Peak)の瞬間だけ「バキッ」と反応します。
    // Exponential function for Marathon Rubicon-like sharpness.
    // Raising to the 4th power makes it respond "snappily" only at the peak moment of the snare.
    const result = Math.pow(intensity, 4);

    // デバッグ用ログ (console は production build で削除される)
    // Debug log (console will be removed in production build)
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
