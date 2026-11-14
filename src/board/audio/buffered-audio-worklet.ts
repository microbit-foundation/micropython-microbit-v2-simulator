/**
 * Plays a queue of sample buffers sent from the main thread.
 *
 * This runs on the audio thread, so the buffers already queued play to the
 * sample whatever the main thread is doing. Built as its own script, as that
 * is how a worklet is loaded.
 */

// Only import types from this file. Anything else would bundle the processor
// into the importing script.

export interface BufferedAudioProcessorOptions {
  /**
   * A buffer that arrives when nothing is queued isn't played until this much
   * is queued, so that it doesn't run out before the ones after it arrive.
   */
  startQueuedSeconds: number;
  /** The longest to wait for that. */
  startDelaySeconds: number;
}

export type BufferedAudioRequest =
  | {
      kind: "data";
      samples: Float32Array;
      sampleRate: number;
      generation: number;
    }
  /** Discard everything queued. */
  | { kind: "stop" }
  /** Let the processor be collected. */
  | { kind: "close" };

/** Sent when buffers finish playing. */
export interface BufferedAudioResponse {
  ended: number;
  /** From the data requests, so the response can be matched to a stop. */
  generation: number;
}

// The worklet global scope isn't in TypeScript's DOM types.
declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processor: unknown): void;

interface QueuedBuffer {
  samples: Float32Array;
  /** Input samples per output sample. */
  step: number;
  generation: number;
}

class BufferedAudioProcessor extends AudioWorkletProcessor {
  private queue: QueuedBuffer[] = [];
  /** Position in the first queued buffer, fractional when resampling. */
  private position = 0;
  private startQueuedFrames: number;
  private startDelayFrames: number;
  /** While waiting to start, how much longer to wait at most. */
  private delayFrames = 0;
  /** While waiting to start, the output frames queued. */
  private queuedFrames = 0;
  private closed = false;

  constructor(options: { processorOptions: BufferedAudioProcessorOptions }) {
    super();
    const { startQueuedSeconds, startDelaySeconds } = options.processorOptions;
    this.startQueuedFrames = startQueuedSeconds * sampleRate;
    this.startDelayFrames = Math.round(startDelaySeconds * sampleRate);
    this.port.onmessage = (e: MessageEvent<BufferedAudioRequest>) => {
      const request = e.data;
      switch (request.kind) {
        case "data": {
          if (this.queue.length === 0) {
            this.position = 0;
            this.delayFrames = this.startDelayFrames;
            this.queuedFrames = 0;
          }
          const step = request.sampleRate / sampleRate;
          this.queuedFrames += request.samples.length / step;
          this.queue.push({
            samples: request.samples,
            step,
            generation: request.generation,
          });
          break;
        }
        case "stop": {
          this.queue.length = 0;
          break;
        }
        case "close": {
          this.closed = true;
          break;
        }
      }
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0][0];
    let ended = 0;
    let generation = 0;
    for (let i = 0; i < output.length; i++) {
      if (this.delayFrames > 0) {
        if (this.queuedFrames < this.startQueuedFrames) {
          this.delayFrames--;
          continue;
        }
        this.delayFrames = 0;
      }
      let head = this.queue[0];
      while (head && this.position >= head.samples.length) {
        this.position -= head.samples.length;
        generation = head.generation;
        ended++;
        this.queue.shift();
        head = this.queue[0];
      }
      if (!head) {
        break;
      }
      // Linear interpolation, into the next buffer at the end of this one so
      // there's no seam between buffers.
      const index = Math.floor(this.position);
      const fraction = this.position - index;
      const current = head.samples[index];
      const next =
        index + 1 < head.samples.length
          ? head.samples[index + 1]
          : this.queue[1]
            ? this.queue[1].samples[0]
            : current;
      output[i] = current + (next - current) * fraction;
      this.position += head.step;
    }
    if (ended > 0) {
      const response: BufferedAudioResponse = { ended, generation };
      this.port.postMessage(response);
    }
    return !this.closed;
  }
}

registerProcessor("buffered-audio", BufferedAudioProcessor);
