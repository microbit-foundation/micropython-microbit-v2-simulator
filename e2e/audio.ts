/**
 * Records what the simulator sends to the speakers so tests can check broad
 * properties of the sound: whether there is any, how long it lasts, its
 * level and pitch, and whether it has dropouts. Timing varies from run to run,
 * so don't compare samples exactly.
 */

/**
 * Runs in the simulator iframe before its scripts. All the simulator's audio
 * reaches the destination via a single node, so tapping connections to the
 * destination records the final mix, after volume and mute.
 */
export function installAudioRecorder() {
  if (window === window.top) {
    return;
  }
  const w = window as any;
  w.__audioRecording = { sampleRate: 0, chunks: [] as Float32Array[] };
  const connect = AudioNode.prototype.connect as Function;
  AudioNode.prototype.connect = function (
    this: AudioNode,
    destination: any,
    ...rest: any[]
  ) {
    if (destination instanceof AudioDestinationNode && !(this as any).__tap) {
      // ScriptProcessorNode is deprecated, but unlike AudioWorkletNode it
      // can be created synchronously here.
      const tap = this.context.createScriptProcessor(4096, 1, 1);
      (tap as any).__tap = true;
      w.__audioRecording.sampleRate = this.context.sampleRate;
      tap.onaudioprocess = (e) => {
        w.__audioRecording.chunks.push(
          new Float32Array(e.inputBuffer.getChannelData(0)),
        );
      };
      connect.call(this, tap);
      connect.call(tap, destination);
    }
    return connect.call(this, destination, ...rest);
  } as any;
}

const silenceThreshold = 1e-3;

export interface AudioStats {
  /** Length of the analysed audio. */
  seconds: number;
  /** From the first to the last non-silent sample. */
  soundSeconds: number;
  /** RMS level between the first and last non-silent sample. */
  rms: number;
  /** Estimated from zero crossings, so only meaningful for simple tones. */
  frequency: number;
  /**
   * Silences of at least 1 ms between the first and last sound. Buffer
   * underruns show up here and are heard as buzzing.
   */
  gaps: number;
}

export class AudioRecording {
  constructor(
    readonly samples: Float32Array,
    readonly sampleRate: number,
  ) {}

  stats(): AudioStats {
    return analyse(this.samples, this.sampleRate);
  }

  /** Stats for consecutive windows, e.g. to follow a sequence of notes. */
  windows(windowSeconds: number): AudioStats[] {
    const size = Math.round(windowSeconds * this.sampleRate);
    const result: AudioStats[] = [];
    for (let i = 0; i + size <= this.samples.length; i += size) {
      result.push(analyse(this.samples.subarray(i, i + size), this.sampleRate));
    }
    return result;
  }
}

function analyse(samples: Float32Array, sampleRate: number): AudioStats {
  let first = -1;
  let last = -1;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > silenceThreshold) {
      if (first === -1) {
        first = i;
      }
      last = i;
    }
  }
  const seconds = samples.length / sampleRate;
  if (first === -1) {
    return { seconds, soundSeconds: 0, rms: 0, frequency: 0, gaps: 0 };
  }

  const minGap = 0.001 * sampleRate;
  let sumSquares = 0;
  let crossings = 0;
  let gaps = 0;
  let silentRun = 0;
  for (let i = first; i <= last; i++) {
    const s = samples[i];
    sumSquares += s * s;
    if (i > first && samples[i - 1] < 0 && s >= 0) {
      crossings++;
    }
    if (Math.abs(s) <= silenceThreshold) {
      silentRun++;
    } else {
      if (silentRun >= minGap) {
        gaps++;
      }
      silentRun = 0;
    }
  }
  const length = last - first + 1;
  return {
    seconds,
    soundSeconds: length / sampleRate,
    rms: Math.sqrt(sumSquares / length),
    frequency: (crossings * sampleRate) / length,
    gaps,
  };
}
