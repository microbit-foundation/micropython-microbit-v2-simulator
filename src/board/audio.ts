interface AudioUIOptions {
  defaultAudioCallback: () => void;
  speechAudioCallback: () => void;
}

export class AudioUI {
  private frequency: number = 440;
  private context: AudioContext | undefined;
  private oscillator: OscillatorNode | undefined;

  default: BufferedAudio | undefined;
  speech: BufferedAudio | undefined;

  constructor() {}

  initialize({ defaultAudioCallback, speechAudioCallback }: AudioUIOptions) {
    this.context = new AudioContext({
      // Match the regular audio rate.
      sampleRate: 7812 * 4,
    });
    this.default = new BufferedAudio(this.context, defaultAudioCallback);
    this.speech = new BufferedAudio(this.context, speechAudioCallback);
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
      this.oscillator.connect(this.context!.destination);
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

  constructor(private context: AudioContext, private callback: () => void) {}

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
    source.connect(this.context.destination);
    const currentTime = this.context.currentTime;
    let first = this.nextStartTime < currentTime;
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
