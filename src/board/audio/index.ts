import type {
  BufferedAudioProcessorOptions,
  BufferedAudioRequest,
  BufferedAudioResponse,
} from "./buffered-audio-worklet";
import { replaceBuiltinSound } from "./built-in-sounds";
import { SoundEmojiSynthesizer } from "./sound-emoji-synthesizer";
import { parseSoundEffects } from "./sound-expressions";

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

interface AudioOptions {
  defaultAudioCallback: () => void;
  speechAudioCallback: () => void;
}

export class Audio {
  private frequency: number = 440;
  // You can mute the sim before it's running so we can't immediately write to the muteNode.
  private muted: boolean = false;
  private context: AudioContext | undefined;
  private workletLoaded: Promise<boolean> | undefined;
  private oscillator: OscillatorNode | undefined;
  private volumeNode: GainNode | undefined;
  private muteNode: GainNode | undefined;

  default: BufferedAudio | undefined;
  speech: BufferedAudio | undefined;
  soundExpression: BufferedAudio | undefined;
  currentSoundExpressionCallback: undefined | (() => void);

  constructor() {}

  async initializeCallbacks({
    defaultAudioCallback,
    speechAudioCallback,
  }: AudioOptions) {
    if (!this.context) {
      throw new Error("Context must be pre-created from a user event");
    }
    const hasWorklet = await this.workletLoaded!;
    this.default?.dispose();
    this.speech?.dispose();
    this.soundExpression?.dispose();
    this.muteNode = this.context.createGain();
    this.muteNode.gain.setValueAtTime(
      this.muted ? 0 : 1,
      this.context.currentTime,
    );
    this.muteNode.connect(this.context.destination);
    this.volumeNode = this.context.createGain();
    this.volumeNode.connect(this.muteNode);

    const createNode = (
      startQueuedSeconds: number,
      startDelaySeconds: number,
    ) => {
      if (!hasWorklet) {
        return undefined;
      }
      const processorOptions: BufferedAudioProcessorOptions = {
        startQueuedSeconds,
        startDelaySeconds,
      };
      const node = new AudioWorkletNode(this.context!, "buffered-audio", {
        numberOfInputs: 0,
        outputChannelCount: [1],
        processorOptions,
      });
      node.connect(this.volumeNode!);
      return node;
    };
    this.default = new BufferedAudio(
      createNode(startQueuedSeconds, startDelaySeconds),
      defaultAudioCallback,
    );
    this.speech = new BufferedAudio(
      createNode(startQueuedSeconds, startDelaySeconds),
      speechAudioCallback,
    );
    this.soundExpression = new BufferedAudio(
      createNode(0, 0),
      () => {
        if (this.currentSoundExpressionCallback) {
          this.currentSoundExpressionCallback();
        }
      },
      lookaheadSeconds,
    );
  }

  async createAudioContextFromUserInteraction(): Promise<void> {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)({
        // The highest rate is the sound expression synth.
        sampleRate: 44100,
      });
      // Browsers only provide worklets in a secure context. Without one,
      // buffered audio is silent.
      this.workletLoaded = this.context.audioWorklet
        ? this.context.audioWorklet
            .addModule("build/audio-worklet.js")
            .then(() => true)
            .catch((e) => {
              console.error("Failed to load the audio worklet", e);
              return false;
            })
        : Promise.resolve(false);
    }
    if (this.context.state === "suspended") {
      return this.context.resume();
    }
  }

  playSoundExpression(expr: string) {
    // Replaces anything still playing.
    this.soundExpression!.stop();
    const soundEffects = parseSoundEffects(replaceBuiltinSound(expr));
    const onDone = () => {
      // The synth has generated everything. What's scheduled plays out.
      this.currentSoundExpressionCallback = undefined;
    };
    const synth = new SoundEmojiSynthesizer(0, onDone);
    synth.play(soundEffects);

    this.soundExpression!.init(synth.sampleRate);
    const callback = () => {
      const source = synth.pull();
      const target = this.soundExpression!.createBuffer(source.length);
      for (let i = 0; i < source.length; i++) {
        // Buffer is (0, 1023) we need to map it to (-1, 1)
        target[i] = (source[i] - 512) / 512;
      }
      this.soundExpression!.writeData(target);
    };
    this.currentSoundExpressionCallback = callback;
    callback();
  }

  stopSoundExpression(): void {
    this.currentSoundExpressionCallback = undefined;
    this.soundExpression?.stop();
  }

  isSoundExpressionActive(): boolean {
    return (
      !!this.currentSoundExpressionCallback ||
      !!this.soundExpression?.isPlaying()
    );
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
      this.context!.currentTime,
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

  boardStopped() {
    // Also called for a soft reboot, after which the same module plays again,
    // so this must leave the callbacks connected.
    this.stopOscillator();
    this.speech?.stop();
    this.stopSoundExpression();
    this.default?.stop();
  }

  private stopOscillator() {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator = undefined;
    }
  }
}

/**
 * Each kind of buffered audio is asked for this much ahead of what is playing.
 * The buffers are under 12 ms and the next is requested from the main thread,
 * so without a margin any brief stall there is heard as a click.
 */
const lookaheadSeconds = 0.1;

/**
 * Audio frames and speech don't start playing until this much is queued.
 * Their buffers can be as short as 3.4 ms and the firmware has to run again
 * to produce each of those that follow, so playing the first straight away
 * risks running out before the second arrives.
 */
const startQueuedSeconds = 0.01;

/**
 * The longest to wait for that, so that a sound shorter than it still plays.
 */
const startDelaySeconds = 0.02;

/**
 * Queues buffers of samples to play one after another on the audio thread.
 * The callback is called as each finishes, for the next to be written.
 */
class BufferedAudio {
  private sampleRate: number = -1;
  /** The length in seconds of each buffer written that has yet to finish. */
  private pending: number[] = [];
  private pendingSeconds = 0;
  /** Counts stops, to ignore buffers reported finished that were discarded. */
  private generation = 0;

  /**
   * @param node Undefined if the browser can't load the worklet, in which case
   * there's no sound but buffers still finish so that programs don't hang.
   * @param lookaheadSeconds Keep at least this much audio queued by calling
   * back for more straight away. Only for callbacks that write synchronously.
   */
  constructor(
    private node: AudioWorkletNode | undefined,
    private callback: () => void,
    private lookaheadSeconds: number = 0,
  ) {
    if (node) {
      node.port.onmessage = (e: MessageEvent<BufferedAudioResponse>) => {
        this.ended(e.data.ended, e.data.generation);
      };
    }
  }

  init(sampleRate: number) {
    // Anything still queued plays out, with new audio following on, so
    // playing sounds one after another neither overlaps nor clips them.
    this.sampleRate = sampleRate;
  }

  createBuffer(length: number) {
    return new Float32Array(length);
  }

  /** Takes ownership of the buffer. */
  writeData(samples: Float32Array) {
    const seconds = samples.length / this.sampleRate;
    this.pending.push(seconds);
    this.pendingSeconds += seconds;
    const generation = this.generation;
    if (this.node) {
      this.post(
        {
          kind: "data",
          samples,
          sampleRate: this.sampleRate,
          generation,
        },
        [samples.buffer],
      );
    } else {
      setTimeout(() => this.ended(1, generation), seconds * 1000);
    }
    if (this.pendingSeconds < this.lookaheadSeconds) {
      this.callback();
    }
  }

  private ended(count: number, generation: number) {
    if (generation !== this.generation) {
      return;
    }
    for (let i = 0; i < count; i++) {
      this.pending.shift();
      // Summed again, as subtracting would accumulate rounding errors.
      this.pendingSeconds = this.pending.reduce((a, b) => a + b, 0);
      this.callback();
    }
  }

  /** Whether anything written is still to finish playing. */
  isPlaying(): boolean {
    return this.pending.length > 0;
  }

  /**
   * Whether it's playing with less than the lookahead queued. For audio
   * whose callback can't write synchronously, so the firmware tops it up.
   */
  wantsData(): boolean {
    return this.isPlaying() && this.pendingSeconds < lookaheadSeconds;
  }

  /**
   * Silences what has been written but not yet played. Nothing more is
   * requested via the callback until there's another write.
   */
  stop() {
    this.generation++;
    this.pending = [];
    this.pendingSeconds = 0;
    this.post({ kind: "stop" });
  }

  dispose() {
    this.stop();
    this.callback = () => {};
    this.post({ kind: "close" });
    this.node?.disconnect();
  }

  private post(request: BufferedAudioRequest, transfer: Transferable[] = []) {
    this.node?.port.postMessage(request, transfer);
  }
}
