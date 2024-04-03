import { replaceBuiltinSound } from "./built-in-sounds";
import { SoundEmojiSynthesizer } from "./sound-emoji-synthesizer";
import { parseSoundEffects } from "./sound-expressions";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
    webkitOfflineAudioContext: typeof OfflineAudioContext;
  }
}

interface AudioOptions {
  defaultAudioCallback: () => void;
  speechAudioCallback: () => void;
}

export class BoardAudio {
  private frequency: number = 440;
  // You can mute the sim before it's running so we can't immediately write to the muteNode.
  private muted: boolean = false;
  private context: AudioContext | undefined;
  private oscillator: OscillatorNode | undefined;
  private volumeNode: GainNode | undefined;
  private muteNode: GainNode | undefined;

  default: BufferedAudio | undefined;
  speech: BufferedAudio | undefined;
  soundExpression: BufferedAudio | undefined;
  currentSoundExpressionCallback: undefined | (() => void);
  private stopActiveRecording: (() => void) | undefined;

  constructor() {}

  initializeCallbacks({
    defaultAudioCallback,
    speechAudioCallback,
  }: AudioOptions) {
    if (!this.context) {
      throw new Error("Context must be pre-created from a user event");
    }
    this.muteNode = this.context.createGain();
    this.muteNode.gain.setValueAtTime(
      this.muted ? 0 : 1,
      this.context.currentTime
    );
    this.muteNode.connect(this.context.destination);
    this.volumeNode = this.context.createGain();
    this.volumeNode.connect(this.muteNode);

    this.default = new BufferedAudio(
      this.context,
      this.volumeNode,
      defaultAudioCallback
    );
    this.speech = new BufferedAudio(
      this.context,
      this.volumeNode,
      speechAudioCallback
    );
    this.soundExpression = new BufferedAudio(
      this.context,
      this.volumeNode,
      () => {
        if (this.currentSoundExpressionCallback) {
          this.currentSoundExpressionCallback();
        }
      }
    );
  }

  async createAudioContextFromUserInteraction(): Promise<void> {
    this.context =
      this.context ??
      new (window.AudioContext || window.webkitAudioContext)({
        // The highest rate is the sound expression synth.
        sampleRate: 44100,
      });
    if (this.context.state === "suspended") {
      return this.context.resume();
    }
  }

  playSoundExpression(expr: string) {
    const soundEffects = parseSoundEffects(replaceBuiltinSound(expr));
    const onDone = () => {
      this.stopSoundExpression();
    };
    const synth = new SoundEmojiSynthesizer(0, onDone);
    synth.play(soundEffects);

    const callback = () => {
      const source = synth.pull();
      if (this.context) {
        // Use createBuffer instead of new AudioBuffer to support Safari 14.0.
        const target = this.context.createBuffer(
          1,
          source.length,
          synth.sampleRate
        );
        const channel = target.getChannelData(0);
        for (let i = 0; i < source.length; i++) {
          // Buffer is (0, 1023) we need to map it to (-1, 1)
          channel[i] = (source[i] - 512) / 512;
        }
        this.soundExpression!.writeData(target);
      }
    };
    this.currentSoundExpressionCallback = callback;
    callback();
  }

  stopSoundExpression(): void {
    this.currentSoundExpressionCallback = undefined;
  }

  isSoundExpressionActive(): boolean {
    return !!this.currentSoundExpressionCallback;
  }

  mute() {
    this.muted = true;
    if (this.muteNode) {
      this.muteNode.gain.setValueAtTime(0, this.context!.currentTime);
    }
  }

  unmute() {
    this.muted = false;
    if (this.muteNode) {
      this.muteNode!.gain.setValueAtTime(1, this.context!.currentTime);
    }
  }

  setVolume(volume: number) {
    this.volumeNode!.gain.setValueAtTime(
      volume / 255,
      this.context!.currentTime
    );
  }

  setPeriodUs(periodUs: number) {
    // CODAL defaults in this way:
    this.frequency = periodUs === 0 ? 6068 : 1000000 / periodUs;
    if (this.oscillator) {
      this.oscillator.frequency.value = this.frequency;
    }
  }

  setAmplitudeU10(amplitudeU10: number) {
    this.stopOscillator();
    if (amplitudeU10) {
      this.oscillator = this.context!.createOscillator();
      this.oscillator.type = "sine";
      this.oscillator.connect(this.volumeNode!);
      this.oscillator.frequency.value = this.frequency;
      this.oscillator.start();
    }
  }

  isRecording(): boolean {
    return !!this.stopActiveRecording;
  }

  stopRecording() {
    if (this.stopActiveRecording) {
      this.stopActiveRecording();
    }
  }

  async startRecording(
    sampleRate: number,
    samplesNeeded: number,
    onChunk: (chunk: Float32Array) => void
  ) {
    let samplesSent = 0;
    if (!navigator?.mediaDevices?.getUserMedia) {
      return;
    }
    this.stopRecording();

    this.stopActiveRecording = () => {};
    let micStream: MediaStream | undefined;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
    } catch (e) {
      console.error(e);
      this.stopRecording();
      return;
    }

    const source = this.context!.createMediaStreamSource(micStream);
    // TODO: wire up microphone sensitivity to this gain node
    const gain = this.context!.createGain();
    source.connect(gain);
    // TODO: consider AudioWorklet - worth it? Browser support?
    //       consider alternative resampling approaches
    //       what sample rates are actually supported this way?
    const recorder = this.context!.createScriptProcessor(2048, 1, 1);
    recorder.onaudioprocess = (e) => {
      const offlineContext = new (window.OfflineAudioContext ||
        window.webkitOfflineAudioContext)({
        sampleRate,
        length: sampleRate * (e.inputBuffer.length / e.inputBuffer.sampleRate),
        numberOfChannels: 1,
      });
      const source = offlineContext.createBufferSource();
      source.buffer = e.inputBuffer;
      source.connect(offlineContext.destination);
      source.start();
      offlineContext.addEventListener("complete", (e) => {
        onChunk(e.renderedBuffer.getChannelData(0));
        samplesSent += e.renderedBuffer.length;
        if (samplesSent >= samplesNeeded) {
          this.stopRecording();
        }
      });
      offlineContext.startRendering();
    };
    gain.connect(recorder);
    recorder.connect(this.context!.destination);

    this.stopActiveRecording = () => {
      recorder.disconnect();
      gain.disconnect();
      source.disconnect();
      this.stopActiveRecording = undefined;
    };
  }

  boardStopped() {
    this.stopRecording();
    this.stopOscillator();
    this.speech?.dispose();
    this.soundExpression?.dispose();
    this.default?.dispose();
  }

  private stopOscillator() {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator = undefined;
    }
  }
}

class BufferedAudio {
  nextStartTime: number = -1;
  private sampleRate: number = -1;

  constructor(
    private context: AudioContext,
    private destination: AudioNode,
    private callback: () => void
  ) {}

  init(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.nextStartTime = -1;
  }

  createBuffer(length: number) {
    // Use createBuffer instead of new AudioBuffer to support Safari 14.0.
    return this.context.createBuffer(1, length, this.sampleRate);
  }

  setSampleRate(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  writeData(buffer: AudioBuffer) {
    // Use createBufferSource instead of new AudioBufferSourceNode to support Safari 14.0.
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.onended = this.callback;
    source.connect(this.destination);
    const currentTime = this.context.currentTime;
    const first = this.nextStartTime < currentTime;
    const startTime = first ? currentTime : this.nextStartTime;
    this.nextStartTime = startTime + buffer.length / buffer.sampleRate;
    // For audio frames, we're frequently out of data. Speech is smooth.
    if (first) {
      // We're just getting started so buffer another frame.
      this.callback();
    }
    source.start(startTime);
  }

  dispose() {
    // Prevent calls into WASM when the buffer nodes finish.
    this.callback = () => {};
  }
}
