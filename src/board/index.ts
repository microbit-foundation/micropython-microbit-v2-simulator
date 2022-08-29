import svgText from "../microbit-drawing.svg";
import { Accelerometer } from "./accelerometer";
import { Audio } from "./audio";
import { Button } from "./buttons";
import { Compass } from "./compass";
import {
  MICROBIT_HAL_PIN_FACE,
  MICROBIT_HAL_PIN_P0,
  MICROBIT_HAL_PIN_P1,
  MICROBIT_HAL_PIN_P2,
} from "./constants";
import { DataLogging } from "./data-logging";
import { Display } from "./display";
import { FileSystem } from "./fs";
import { Microphone } from "./microphone";
import { Pin } from "./pins";
import { Radio } from "./radio";
import { RangeSensor, State } from "./state";
import { WebAssemblyOperations } from "./wasm";

const stoppedOpactity = "0.5";

export function createBoard(
  operations: WebAssemblyOperations,
  notifications: Notifications,
  fs: FileSystem
) {
  document.body.insertAdjacentHTML("afterbegin", svgText);
  const svg = document.querySelector("svg");
  if (!svg) {
    throw new Error("No SVG");
  }
  return new Board(operations, notifications, fs, svg);
}

export class Board {
  // Components that manage the state.
  // They keep it in sync with the UI (notifying of changes from user interactions),
  // and get notified external changes and calls from MicroPython.
  // Some call WASM callbacks on significant value changes.
  display: Display;
  buttons: Button[];
  pins: Pin[];
  audio: Audio;
  temperature: RangeSensor;
  microphone: Microphone;
  accelerometer: Accelerometer;
  compass: Compass;
  radio: Radio;
  dataLogging: DataLogging;

  public serialInputBuffer: number[] = [];

  private stoppedOverlay: HTMLDivElement;
  private playButton: HTMLButtonElement;

  private epoch: number | undefined;

  constructor(
    public operations: WebAssemblyOperations,
    private notifications: Notifications,
    private fs: FileSystem,
    private svg: SVGElement
  ) {
    this.display = new Display(
      Array.from(this.svg.querySelector("#LEDsOn")!.querySelectorAll("use"))
    );
    const onChange = this.notifications.onStateChange;
    this.buttons = [
      new Button(
        "buttonA",
        this.svg.querySelector("#ButtonA")!,
        "button A",
        onChange
      ),
      new Button(
        "buttonB",
        this.svg.querySelector("#ButtonB")!,
        "button B",
        onChange
      ),
    ];
    this.pins = Array(33);
    this.pins[MICROBIT_HAL_PIN_FACE] = new Pin(
      "pinLogo",
      this.svg.querySelector("#Logo")!,
      "logo",
      onChange
    );
    this.pins[MICROBIT_HAL_PIN_P0] = new Pin("pin0", null, "pin 0", onChange);
    this.pins[MICROBIT_HAL_PIN_P1] = new Pin("pin1", null, "pin 1", onChange);
    this.pins[MICROBIT_HAL_PIN_P2] = new Pin("pin2", null, "pin 2", onChange);
    this.audio = new Audio();
    this.temperature = new RangeSensor("temperature", -5, 50, 21, "°C");
    this.accelerometer = new Accelerometer(onChange);
    this.compass = new Compass();
    this.microphone = new Microphone(
      this.svg.querySelector("#LitMicrophone")!,
      onChange
    );

    const currentTimeMillis = this.ticksMilliseconds.bind(this);
    this.radio = new Radio(
      this.notifications.onRadioOutput.bind(this.notifications),
      onChange,
      currentTimeMillis
    );
    this.dataLogging = new DataLogging(
      currentTimeMillis,
      this.notifications.onLogOutput,
      this.notifications.onSerialOutput,
      this.notifications.onLogDelete,
      onChange
    );

    this.stoppedOverlay = document.querySelector(".play-button-container")!;
    this.playButton = document.querySelector(".play-button")!;
    this.initializePlayButton();
    // We start stopped.
    this.displayStoppedState();
    this.playButton.addEventListener("click", () =>
      this.notifications.onRequestFlash()
    );
  }

  getState(): State {
    return {
      radio: this.radio.state,
      buttonA: this.buttons[0].state,
      buttonB: this.buttons[1].state,
      pinLogo: this.pins[MICROBIT_HAL_PIN_FACE].state,
      pin0: this.pins[MICROBIT_HAL_PIN_P0].state,
      pin1: this.pins[MICROBIT_HAL_PIN_P1].state,
      pin2: this.pins[MICROBIT_HAL_PIN_P2].state,

      accelerometerX: this.accelerometer.state.accelerometerX,
      accelerometerY: this.accelerometer.state.accelerometerY,
      accelerometerZ: this.accelerometer.state.accelerometerZ,
      gesture: this.accelerometer.state.gesture,

      compassX: this.compass.state.compassX,
      compassY: this.compass.state.compassY,
      compassZ: this.compass.state.compassZ,
      compassHeading: this.compass.state.compassHeading,

      lightLevel: this.display.lightLevel,
      dataLogging: {
        // Placeholder.
        type: "dataLogging",
        logFull: false,
      },
      soundLevel: this.microphone.soundLevel,
      temperature: this.temperature,
    };
  }

  setValue(id: string, value: any) {
    switch (id) {
      case "accelerometerX":
      case "accelerometerY":
      case "accelerometerZ":
      case "gesture": {
        this.accelerometer.setValue(id, value);
        break;
      }
      case "compassX":
      case "compassY":
      case "compassZ":
      case "compassHeading": {
        this.compass.setValue(id, value);
        break;
      }
      case "buttonA": {
        this.buttons[0].setValue(value);
        break;
      }
      case "buttonB": {
        this.buttons[1].setValue(value);
        break;
      }
      case "pinLogo": {
        this.pins[MICROBIT_HAL_PIN_FACE].setValue(value);
        break;
      }
      case "pin0": {
        this.pins[MICROBIT_HAL_PIN_P0].setValue(value);
        break;
      }
      case "pin1": {
        this.pins[MICROBIT_HAL_PIN_P1].setValue(value);
        break;
      }
      case "pin2": {
        this.pins[MICROBIT_HAL_PIN_P2].setValue(value);
        break;
      }
      case "lightLevel": {
        this.display.lightLevel.setValue(value);
        break;
      }
      case "soundLevel": {
        this.microphone.setValue(value);
        break;
      }
      case "temperature": {
        this.temperature.setValue(value);
        break;
      }
    }
  }

  initializedWebAssembly() {
    this.operations.initialize();
    this.notifications.onReady(this.getState());
  }

  initialize() {
    this.epoch = new Date().getTime();
    this.audio.initialize({
      defaultAudioCallback: this.operations.defaultAudioCallback!,
      speechAudioCallback: this.operations.speechAudioCallback!,
    });
    this.buttons.forEach((b) => b.initialize());
    this.pins.forEach((p) => p.initialize());
    this.display.initialize();
    this.accelerometer.initialize(this.operations.gestureCallback!);
    this.compass.initialize();
    this.microphone.initialize(this.operations.soundLevelCallback!);
    this.radio.initialize();
    this.serialInputBuffer.length = 0;
  }

  ticksMilliseconds() {
    return new Date().getTime() - this.epoch!;
  }

  private initializePlayButton() {
    const params = new URLSearchParams(window.location.search);
    const color = params.get("color");
    if (color) {
      this.playButton.style.color = color;
      this.playButton.style.borderColor = color;
    }
    this.playButton.style.display = "flex";
  }

  private displayRunningState() {
    this.svg.style.opacity = "unset";
    const svgButtons = this.svg.querySelectorAll("[role='button']");
    for (const button of svgButtons) {
      button.setAttribute("tabindex", "0");
    }
    this.stoppedOverlay.style.display = "none";
  }

  private displayStoppedState() {
    this.svg.style.opacity = stoppedOpactity;
    const svgButtons = this.svg.querySelectorAll("[role='button']");
    for (const button of svgButtons) {
      button.setAttribute("tabindex", "-1");
    }
    this.stoppedOverlay.style.display = "flex";
  }

  private start() {
    this.operations.start();
    this.displayRunningState();
  }

  async stop(): Promise<void> {
    const interrupt = () => this.serialInputBuffer.push(3, 4); // Ctrl-C, Ctrl-D.
    await this.operations.stop(interrupt);
    this.displayStoppedState();
  }

  async reset(): Promise<void> {
    await this.stop();
    this.start();
  }

  async flash(filesystem: Record<string, Uint8Array>): Promise<void> {
    await this.stop();
    this.fs.clear();
    Object.entries(filesystem).forEach(([name, value]) => {
      const idx = this.fs.create(name);
      this.fs.write(idx, value);
    });
    return this.start();
  }

  mute() {
    this.audio.mute();
  }

  unmute() {
    this.audio.unmute();
  }

  writeSerialInput(text: string) {
    for (let i = 0; i < text.length; i++) {
      this.serialInputBuffer.push(text.charCodeAt(i));
    }
  }

  /**
   * Read a character code from the serial input buffer or -1 if none.
   */
  readSerialInput(): number {
    return this.serialInputBuffer.shift() ?? -1;
  }

  writeSerialOutput(text: string): void {
    this.notifications.onSerialOutput(text);
  }

  dispose() {
    this.audio.dispose();
    this.buttons.forEach((b) => b.dispose());
    this.pins.forEach((p) => p.dispose());
    this.display.dispose();
    this.accelerometer.dispose();
    this.compass.dispose();
    this.microphone.dispose();
    this.radio.dispose();
    this.serialInputBuffer.length = 0;

    // Nofify of the state resets.
    this.notifications.onStateChange(this.getState());
  }
}

export interface LogEntry {
  // The headings, if they've changed since the last entry.
  // New headings will only be appended.
  headings?: string[];
  // The data, corresponding to the headings.
  data?: string[];
}

export class Notifications {
  constructor(private target: Pick<Window, "postMessage">) {}

  onReady = (state: State) => {
    this.postMessage("ready", {
      state,
    });
  };

  onRequestFlash = () => {
    this.postMessage("request_flash", {});
  };

  onStateChange = (change: Partial<State>) => {
    this.postMessage("state_change", {
      change,
    });
  };

  onSerialOutput = (data: string) => {
    this.postMessage("serial_output", { data });
  };

  onRadioOutput = (data: Uint8Array) => {
    this.postMessage("radio_output", { data });
  };

  onLogOutput = (data: LogEntry) => {
    this.postMessage("log_output", data);
  };

  onLogDelete = () => {
    this.postMessage("log_delete", {});
  };

  private postMessage(kind: string, data: any) {
    this.target.postMessage(
      {
        kind,
        ...data,
      },
      "*"
    );
  }
}

export const createMessageListener = (board: Board) => (e: MessageEvent) => {
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
      case "mute": {
        board.mute();
        break;
      }
      case "unmute": {
        board.unmute();
        break;
      }
      case "serial_input": {
        if (typeof data.data !== "string") {
          throw new Error("Invalid serial_input data field.");
        }
        board.writeSerialInput(data.data);
        break;
      }
      case "radio_input": {
        if (!(data.data instanceof Uint8Array)) {
          throw new Error("Invalid radio_input data field.");
        }
        board.radio.receive(data.data);
        break;
      }
      case "set_value": {
        const { id, value } = data;
        if (typeof id !== "string") {
          throw new Error(`Invalid id field type: ${id}`);
        }
        board.setValue(id, value);
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
