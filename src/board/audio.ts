interface AudioUIOptions {
  defaultAudioCallback: () => void;
  speechAudioCallback: () => void;
}

export class AudioUI {
  private frequency: number = 440;
  // You can mute the sim before it's running so we can't immediately write to the muteNode.
  private muted: boolean = false;
  private context: AudioContext | undefined;
  private oscillator: OscillatorNode | undefined;
  private volumeNode: GainNode | undefined;
  private muteNode: GainNode | undefined;

  default: BufferedAudio | undefined;
  speech: BufferedAudio | undefined;

  constructor() {}

  initialize({ defaultAudioCallback, speechAudioCallback }: AudioUIOptions) {
    this.context = new AudioContext({
      // Match the regular audio rate.
      sampleRate: 7812 * 4,
    });

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
    this.frequency = 1000000 / periodUs;
    if (this.oscillator) {
      this.oscillator.frequency.value = this.frequency;
    }
  }

  setAmplitudeU10(amplitudeU10: number) {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator = undefined;
    }
    if (amplitudeU10) {
      this.oscillator = this.context!.createOscillator();
      this.oscillator.type = "sine";
      this.oscillator.connect(this.volumeNode!);
      this.oscillator.frequency.value = this.frequency;
      this.oscillator.start();
    }
  }

  dispose() {
    if (this.context) {
      this.context.close();
      this.context = undefined;
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
    return new AudioBuffer({
      sampleRate: this.sampleRate,
      numberOfChannels: 1,
      length,
    });
  }

  writeData(buffer: AudioBuffer) {
    const source = new AudioBufferSourceNode(this.context, {
      buffer,
    });
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
}
