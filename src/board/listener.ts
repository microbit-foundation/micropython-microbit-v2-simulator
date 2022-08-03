import { BoardUI } from "./ui";

export class WebAssemblyOperations {
  private _requestStop: (() => void) | undefined;
  private main: (() => Promise<void>) | undefined;
  private stoppedPromise: Promise<void> | undefined;

  defaultAudioCallback: (() => void) | undefined;
  speechAudioCallback: (() => void) | undefined;

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
}

export const onSensorChange = () =>
  window.parent.postMessage(
    {
      kind: "sensor_change",
      sensors: window.board.sensors,
    },
    "*"
  );

export const createMessageListener = (board: BoardUI) => (e: MessageEvent) => {
  if (e.source === window.parent) {
    const { data } = e;
    switch (data.kind) {
      case "flash": {
        const { filesystem } = data;
        if (!isFileSystem(filesystem)) {
          throw new Error("Invalid flash filesystem field.");
        }
        board.flash(filesystem);
        break;
      }
      case "stop": {
        board.stop();
        break;
      }
      case "reset": {
        board.reset();
        break;
      }
      case "serial_input": {
        if (typeof data.data !== "string") {
          throw new Error("Invalid serial_input data field.");
        }
        board.writeSerial(data.data);
        break;
      }
      case "sensor_set": {
        const sensor = board.getSensor(data.sensor);
        const value = data.value;
        if (!sensor) {
          throw new Error(`Invalid set_sensor sensor field: ${data.sensor}`);
        }
        sensor.setValue(value);
        break;
      }
    }
  }
};

function isFileSystem(
  fileSystem: any
): fileSystem is Record<string, Uint8Array> {
  if (typeof fileSystem !== "object") {
    return false;
  }
  return Object.entries(fileSystem).every(
    ([k, v]) => typeof k === "string" && v instanceof Uint8Array
  );
}
