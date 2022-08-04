interface AudioUIOptions {
  defaultAudioCallback: () => void;
  speechAudioCallback: () => void;
}

export class AudioUI {
  private frequency: number = 440;
  private programVolume: number = 128;
  private muted: boolean = false;
  private context: AudioContext | undefined;
  private oscillator: OscillatorNode | undefined;
  private gainNode: GainNode | undefined;

  default: BufferedAudio | undefined;
  speech: BufferedAudio | undefined;

  constructor() {}

  initialize({ defaultAudioCallback, speechAudioCallback }: AudioUIOptions) {
    this.context = new AudioContext({
      // Match the regular audio rate.
      sampleRate: 7812 * 4,
    });
    this.gainNode = this.context.createGain();
    this.setVolume(this.programVolume, true)
    this.default = new BufferedAudio(this.context, this.gainNode, defaultAudioCallback);
    this.speech = new BufferedAudio(this.context,this.gainNode, speechAudioCallback);
  }

  mute() {
    this.muted = true;
    this.setVolume(0, true)
  }

  unmute() {
    this.muted = false;
    this.setVolume(this.programVolume, true)
  }

  /**
   * Maps device volume range to sensible Web Audio gain output.
   * @param volume 0 - 255
   * @returns 0 - 1
   */
  private convertDeviceVolumeToGain(volume: number) {
    if (!volume) {
      return 0
    }
    return volume / 255;
  }

  setVolume(volume: number, deviceOverride: boolean = false) {
    if(!deviceOverride) {
      this.programVolume = volume
    }
    if (this.gainNode && this.context) {
      const value = this.muted ? 0 : this.convertDeviceVolumeToGain(volume);
      this.gainNode.gain.setValueAtTime(value, this.context.currentTime)
    }
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

  constructor(private context: AudioContext, private gainNode: GainNode, private callback: () => void) {}

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
    this.gainNode.connect(this.context.destination);
    source.connect(this.gainNode);
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
