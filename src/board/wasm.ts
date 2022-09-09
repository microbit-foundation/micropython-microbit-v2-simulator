import { Board } from ".";
import * as conversions from "./conversions";
import { FileSystem } from "./fs";

export interface EmscriptenModule {
  cwrap: any;
  ExitStatus: Error;

  // See EXPORTED_FUNCTIONS in the Makefile.
  _mp_js_request_stop(): void;
  _mp_js_force_stop(): void;
  _microbit_hal_audio_ready_callback(): void;
  _microbit_hal_audio_speech_ready_callback(): void;
  _microbit_hal_gesture_callback(gesture: number): void;
  _microbit_hal_level_detector_callback(level: number): void;
  _microbit_radio_rx_buffer(): number;

  HEAPU8: Uint8Array;

  // Added by us at module creation time for jshal to access.
  board: Board;
  fs: FileSystem;
  conversions: typeof conversions;
}

export class ModuleWrapper {
  private main: () => Promise<void>;

  constructor(private module: EmscriptenModule) {
    const main = module.cwrap("mp_js_main", "null", ["number"], {
      async: true,
    });
    this.main = () => main(64 * 1024);
  }

  /**
   * Throws PanicError if MicroPython panics.
   */
  async start(): Promise<void> {
    return this.main!();
  }

  requestStop(): void {
    this.module._mp_js_request_stop();
  }

  forceStop(): void {
    this.module._mp_js_force_stop();
  }

  writeRadioRxBuffer(packet: Uint8Array) {
    const buf = this.module._microbit_radio_rx_buffer!();
    this.module.HEAPU8.set(packet, buf);
    return buf;
  }
}
