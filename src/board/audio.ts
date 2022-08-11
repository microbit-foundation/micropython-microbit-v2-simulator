import { SoundEmojiSynthesizer } from "./audio/sound-emoji-synthesizer";
import { parseSoundEffects, SoundEffect } from "./audio/sound-expressions";

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
  soundExpression: BufferedAudio | undefined;
  currentSoundExpressionCallback: undefined | (() => void);

  constructor() {}

  initialize({ defaultAudioCallback, speechAudioCallback }: AudioUIOptions) {
    this.context = new AudioContext({
      // The highest rate is the sound expression synth.
      sampleRate: 44100,
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

  playSoundExpression(expression: string) {
    const soundEffects = parseSoundEffects(replaceBuiltin(expression));
    const onDone = () => {
      this.stopSoundExpression();
    };
    const synth = new SoundEmojiSynthesizer(0, onDone);
    synth.play(soundEffects);

    const callback = () => {
      const source = synth.pull();
      const target = new AudioBuffer({
        sampleRate: synth.sampleRate,
        numberOfChannels: 1,
        length: source.length,
      });
      const channel = target.getChannelData(0);
      for (let i = 0; i < source.length; i++) {
        // Buffer is (0, 1023) we need to map it to (-1, 1)
        channel[i] = (source[i] - 512) / 512;
      }
      this.soundExpression!.writeData(target);
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

function replaceBuiltin(expression: string) {
  switch (expression) {
    case "giggle":
      return "010230988019008440044008881023001601003300240000000000000000000000000000,110232570087411440044008880352005901003300010000000000000000010000000000,310232729021105440288908880091006300000000240700020000000000003000000000,310232729010205440288908880091006300000000240700020000000000003000000000,310232729011405440288908880091006300000000240700020000000000003000000000";
    case "happy":
      return "010231992066911440044008880262002800001800020500000000000000010000000000,002322129029508440240408880000000400022400110000000000000000007500000000,000002129029509440240408880145000400022400110000000000000000007500000000";
    case "hello":
      return "310230673019702440118708881023012800000000240000000000000000000000000000,300001064001602440098108880000012800000100040000000000000000000000000000,310231064029302440098108881023012800000100040000000000000000000000000000";
    case "mysterious":
      return "400002390033100440240408880477000400022400110400000000000000008000000000,405512845385000440044008880000012803010500160000000000000000085000500015";
    case "sad":
      return "310232226070801440162408881023012800000100240000000000000000000000000000,310231623093602440093908880000012800000100240000000000000000000000000000";
    case "slide":
      return "105202325022302440240408881023012801020000110400000000000000010000000000,010232520091002440044008881023012801022400110400000000000000010000000000";
    case "soaring":
      return "210234009530905440599908881023002202000400020250000000000000020000000000,402233727273014440044008880000003101024400030000000000000000000000000000";
    case "spring":
      return "306590037116312440058708880807003400000000240000000000000000050000000000,010230037116313440058708881023003100000000240000000000000000050000000000";
    case "twinkle":
      return "010180007672209440075608880855012800000000240000000000000000000000000000";
    case "yawn":
      return "200002281133202440150008881023012801024100240400030000000000010000000000,005312520091002440044008880636012801022400110300000000000000010000000000,008220784019008440044008880681001600005500240000000000000000005000000000,004790784019008440044008880298001600000000240000000000000000005000000000,003210784019008440044008880108001600003300080000000000000000005000000000";
    default:
      return expression;
  }
}
