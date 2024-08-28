import { SRC } from "@alexanderolsen/libsamplerate-js/dist/src";
import { replaceBuiltinSound } from "./built-in-sounds";
import { SoundEmojiSynthesizer } from "./sound-emoji-synthesizer";
import { parseSoundEffects } from "./sound-expressions";
import {
  create as createSampleRateConverter,
  ConverterType,
} from "@alexanderolsen/libsamplerate-js";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
    webkitOfflineAudioContext: typeof OfflineAudioContext;
  }
}

interface AudioOptions {
  defaultAudioCallback: () => void;
  defaultResampler: SRC;
  speechAudioCallback: () => void;
  speechResampler: SRC;
  soundExpressionResampler: SRC;
  recordingResampler: SRC;
}

export class BoardAudio {
  private frequency: number = 440;
  // You can mute the sim before it's running so we can't immediately write to the muteNode.
  private muted: boolean = false;
  private context: AudioContext | undefined;
  private oscillator: OscillatorNode | undefined;
  private volumeNode: GainNode | undefined;
  private muteNode: GainNode | undefined;
  private sensitivityNode: GainNode | undefined;

  private recordingResampler: SRC | undefined;

  default: BufferedAudio | undefined;
  speech: BufferedAudio | undefined;
  soundExpression: BufferedAudio | undefined;
  currentSoundExpressionCallback: undefined | (() => void);
  private stopActiveRecording: (() => void) | undefined;

  constructor(private microphoneEl: SVGElement) {}

  initializeCallbacks({
    defaultAudioCallback,
    defaultResampler,
    speechAudioCallback,
    speechResampler,
    soundExpressionResampler,
    recordingResampler,
  }: AudioOptions) {
    if (!this.context) {
      throw new Error("Context must be pre-created from a user event");
    }
    this.recordingResampler = recordingResampler;

    this.muteNode = this.context.createGain();
    this.muteNode.gain.setValueAtTime(
      this.muted ? 0 : 1,
      this.context.currentTime
    );
    this.muteNode.connect(this.context.destination);
    this.sensitivityNode = this.context.createGain();
    this.sensitivityNode.gain.setValueAtTime(
      0.2, // sensitivity medium level
      this.context.currentTime
    );
    this.volumeNode = this.context.createGain();
    this.volumeNode.connect(this.muteNode);

    this.default = new BufferedAudio(
      this.context,
      this.volumeNode,
      defaultResampler,
      defaultAudioCallback
    );
    this.speech = new BufferedAudio(
      this.context,
      this.volumeNode,
      speechResampler,
      speechAudioCallback
    );
    this.soundExpression = new BufferedAudio(
      this.context,
      this.volumeNode,
      soundExpressionResampler,
      () => {
        if (this.currentSoundExpressionCallback) {
          this.currentSoundExpressionCallback();
        }
      }
    );
  }

  async createAudioContextFromUserInteraction(): Promise<void> {
    // If we set a 44.1kHz rate then we fail to connect to user media on Mac as it selects 48000
    // So we leave it at the default hoping it's most likely to match user media...
    // Until there's progress on this there doesn't seem a better way:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1674892
    this.context =
      this.context ?? new (window.AudioContext || window.webkitAudioContext)();

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
    this.soundExpression!.setSampleRate(synth.sampleRate);
    synth.play(soundEffects);

    const callback = () => {
      const source = synth.pull();
      if (this.context) {
        const target = new Float32Array(source.length);
        for (let i = 0; i < source.length; i++) {
          // Buffer is (0, 1023) we need to map it to (-1, 1)
          target[i] = (source[i] - 512) / 512;
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

  setSensitivity(sensitivity: number) {
    this.sensitivityNode!.gain.setValueAtTime(
      // check if this is correct
      sensitivity,
      this.context!.currentTime
    );
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
        // It seems Firefox ignores the rate set here
        audio: true,
      });
    } catch (e) {
      console.error(e);
      this.stopRecording();
      return;
    }
    this.microphoneEl.style.display = "unset";

    const source = this.context!.createMediaStreamSource(micStream);
    source.connect(this.sensitivityNode!);

    const recorder = this.context!.createScriptProcessor(2048, 1, 1);

    const inputSampleRate = this.context!.sampleRate;
    this.recordingResampler!.inputSampleRate = inputSampleRate;
    this.recordingResampler!.outputSampleRate = sampleRate;

    recorder.onaudioprocess = (e) => {
      const resampled = this.recordingResampler!.full(
        e.inputBuffer.getChannelData(0)
      );
      onChunk(resampled);
      samplesSent += resampled.length;
      if (samplesSent >= samplesNeeded) {
        this.stopRecording();
      }
    };
    this.stopActiveRecording = () => {
      recorder.disconnect();
      this.sensitivityNode!.disconnect();
      source.disconnect();
      micStream?.getTracks().forEach((track) => track.stop());
      this.microphoneEl.style.display = "none";
      this.stopActiveRecording = undefined;
    };

    this.sensitivityNode!.connect(recorder);
    recorder.connect(this.context!.destination);
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

  constructor(
    private context: AudioContext,
    private destination: AudioNode,
    private resampler: SRC,
    private callback: () => void
  ) {
    this.resampler.outputSampleRate = this.context.sampleRate;
  }

  init(sampleRate: number) {
    // This is called for each new audio source so don't reset nextStartTime
    // or we start to overlap audio
    this.setSampleRate(sampleRate);
  }

  setSampleRate(sampleRate: number) {
    this.resampler.inputSampleRate = sampleRate;
  }

  writeData(data: Float32Array) {
    // In practice the supported range is less than the 8k..96k required by the spec and varies by browser
    // for a consistent performance profile we're always resampling for now rather than letting Web Audio do it
    let sampleRate = this.context.sampleRate;
    data = this.resampler.full(data);

    // Use createXXX instead to support Safari 14.0.
    const buffer = this.context.createBuffer(1, data.length, sampleRate);
    buffer.copyToChannel(data, 0);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.onended = this.callCallback;
    source.connect(this.destination);
    const currentTime = this.context.currentTime;
    const first = this.nextStartTime < currentTime;
    const startTime = first ? currentTime : this.nextStartTime;
    this.nextStartTime = startTime + buffer.length / buffer.sampleRate;
    if (first) {
      // We're just getting started so buffer another frame.
      this.callback();
    }
    source.start(startTime);
  }

  private callCallback = () => {
    // Indirect so we can clear callback later
    this.callback();
  };

  dispose() {
    // Prevent calls into WASM when the buffer nodes finish.
    this.callback = () => {};
  }
}
