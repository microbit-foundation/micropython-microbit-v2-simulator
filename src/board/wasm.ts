/**
 * The places where we call into WASM or write to WASM owned memory.
 */
export class WebAssemblyOperations {
  private _requestStop: (() => void) | undefined;
  private main: (() => Promise<void>) | undefined;
  private stoppedPromise: Promise<void> | undefined;

  defaultAudioCallback: (() => void) | undefined;
  speechAudioCallback: (() => void) | undefined;
  gestureCallback: ((gesture: number) => void) | undefined;
  soundLevelCallback: ((soundLevel: number) => void) | undefined;
  private radioRxBuffer: (() => number) | undefined;

  initialize() {
    const cwrap = (window as any).Module.cwrap;
    this._requestStop = cwrap("mp_js_request_stop", "null", [], {});

    this.defaultAudioCallback = cwrap(
      "microbit_hal_audio_ready_callback",
      "null",
      [],
      {}
    );

    this.speechAudioCallback = cwrap(
      "microbit_hal_audio_speech_ready_callback",
      "null",
      [],
      {}
    );

    this.gestureCallback = cwrap(
      "microbit_hal_gesture_callback",
      "null",
      ["number"],
      {}
    );

    this.soundLevelCallback = cwrap(
      "microbit_hal_level_detector_callback",
      "null",
      ["number"],
      {}
    );

    this.radioRxBuffer = cwrap("microbit_radio_rx_buffer", "null", [], {});

    const main = cwrap("mp_js_main", "null", ["number"], {
      async: true,
    });
    this.main = () => main(64 * 1024);
  }

  start(): void {
    if (this.stoppedPromise) {
      throw new Error("Already started!");
    }
    this.stoppedPromise = this.main!();
  }

  async stop(interrupt: () => void): Promise<void> {
    if (this.stoppedPromise) {
      this._requestStop!();
      interrupt();
      await this.stoppedPromise;
      this.stoppedPromise = undefined;
    }
  }

  writeRadioRxBuffer(packet: Uint8Array) {
    const buf = this.radioRxBuffer!();
    window.HEAPU8.set(packet, buf);
    return buf;
  }
}
