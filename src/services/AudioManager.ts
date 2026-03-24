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
    this.analyser.fftSize = 256;
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
   * ビート（キック）の強さを取得してグリッチに回す
   */
  public getBeatIntensity() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const lowFreq = data.slice(0, 10).reduce((a, b) => a + b) / 10;
    const intensity = lowFreq / 255;

    // 【調整】一定以下の音量（ノイズ等）なら 0 にする
    if (intensity < 0.3) return 0;

    // 【調整】急激な変化を抑える（あるいは増幅する）
    return Math.pow(intensity, 2); // 2乗すると、大きなビートの時だけ際立つ
  }
}

// ふむ。Reverb.js を作ったときの経験が役立ったみたいだ。 --- IGNORE ---
// Hmm. Seems like the experience from creating Reverb.js was helpful. --- IGNORE ---
// <https://npmjs.com/package/@logue/reverb>
