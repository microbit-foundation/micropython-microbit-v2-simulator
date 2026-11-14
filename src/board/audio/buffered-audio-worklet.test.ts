import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type {
  BufferedAudioRequest,
  BufferedAudioResponse,
} from "./buffered-audio-worklet";

interface Processor {
  port: { onmessage: (e: { data: BufferedAudioRequest }) => void };
  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean;
}

const contextSampleRate = 40_000;

describe("BufferedAudioProcessor", () => {
  let responses: BufferedAudioResponse[];
  let registered: any;

  beforeAll(async () => {
    const scope = globalThis as any;
    scope.sampleRate = contextSampleRate;
    scope.AudioWorkletProcessor = class {
      port = {
        postMessage: (response: BufferedAudioResponse) =>
          responses.push(response),
      };
    };
    scope.registerProcessor = (_name: string, processor: unknown) => {
      registered = processor;
    };
    await import("./buffered-audio-worklet");
  });

  beforeEach(() => {
    responses = [];
  });

  const createProcessor = (
    startQueuedSeconds = 0,
    startDelaySeconds = 0,
  ): Processor =>
    new registered({
      processorOptions: { startQueuedSeconds, startDelaySeconds },
    });

  const send = (processor: Processor, request: BufferedAudioRequest) =>
    processor.port.onmessage({ data: request });

  const data = (
    samples: number[],
    sampleRate = contextSampleRate,
    generation = 0,
  ): BufferedAudioRequest => ({
    kind: "data",
    samples: new Float32Array(samples),
    sampleRate,
    generation,
  });

  const render = (processor: Processor, frames: number) => {
    const output = new Float32Array(frames);
    expect(processor.process([], [[output]])).toBe(true);
    return Array.from(output);
  };

  it("plays buffers in order then silence", () => {
    const processor = createProcessor();
    send(processor, data([0.25, 0.5]));
    send(processor, data([0.75]));
    expect(render(processor, 5)).toEqual([0.25, 0.5, 0.75, 0, 0]);
    expect(responses).toEqual([{ ended: 2, generation: 0 }]);
  });

  it("reports buffers as they end", () => {
    const processor = createProcessor();
    send(processor, data([0.25, 0.5]));
    send(processor, data([0.75, 1]));
    render(processor, 3);
    expect(responses).toEqual([{ ended: 1, generation: 0 }]);
    render(processor, 3);
    expect(responses).toEqual([
      { ended: 1, generation: 0 },
      { ended: 1, generation: 0 },
    ]);
  });

  it("interpolates a lower sample rate across buffers", () => {
    const processor = createProcessor();
    send(processor, data([0, 0.5], contextSampleRate / 2));
    send(processor, data([1, 0], contextSampleRate / 2));
    expect(render(processor, 9)).toEqual([0, 0.25, 0.5, 0.75, 1, 0.5, 0, 0, 0]);
  });

  it("waits for enough to be queued before starting", () => {
    const processor = createProcessor(
      3 / contextSampleRate,
      100 / contextSampleRate,
    );
    send(processor, data([0.25, 0.5]));
    expect(render(processor, 4)).toEqual([0, 0, 0, 0]);
    send(processor, data([0.75]));
    expect(render(processor, 4)).toEqual([0.25, 0.5, 0.75, 0]);
    // Having run out, it waits again.
    send(processor, data([1, 1]));
    expect(render(processor, 2)).toEqual([0, 0]);
  });

  it("counts what is queued at the output sample rate", () => {
    const processor = createProcessor(
      4 / contextSampleRate,
      100 / contextSampleRate,
    );
    send(processor, data([0.5, 1], contextSampleRate / 2));
    expect(render(processor, 2)).toEqual([0.5, 0.75]);
  });

  it("starts after the delay with less queued", () => {
    const processor = createProcessor(
      3 / contextSampleRate,
      2 / contextSampleRate,
    );
    send(processor, data([0.5]));
    expect(render(processor, 4)).toEqual([0, 0, 0.5, 0]);
  });

  it("discards what is queued on stop", () => {
    const processor = createProcessor();
    send(processor, data([0.5, 0.5, 0.5]));
    render(processor, 1);
    send(processor, { kind: "stop" });
    send(processor, data([1], contextSampleRate, 1));
    expect(render(processor, 3)).toEqual([1, 0, 0]);
    expect(responses).toEqual([{ ended: 1, generation: 1 }]);
  });

  it("finishes when closed", () => {
    const processor = createProcessor();
    send(processor, { kind: "close" });
    expect(processor.process([], [[new Float32Array(1)]])).toBe(false);
  });
});
