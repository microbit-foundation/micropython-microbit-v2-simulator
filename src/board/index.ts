import svgText from "../microbit-drawing.svg";
import { Accelerometer } from "./accelerometer";
import { Audio } from "./audio";
import { Button } from "./buttons";
import {
  MICROBIT_HAL_PIN_FACE,
  MICROBIT_HAL_PIN_P0,
  MICROBIT_HAL_PIN_P1,
  MICROBIT_HAL_PIN_P2,
} from "./constants";
import { Display } from "./display";
import { FileSystem } from "./fs";
import { WebAssemblyOperations } from "./wasm";
import { Microphone } from "./microphone";
import { Pin } from "./pins";
import { Radio } from "./radio";
import { RangeSensor, Sensor } from "./sensors";

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
  private display: Display;
  private buttons: Button[];
  private pins: Pin[];
  private audio = new Audio();
  private temperature: RangeSensor;
  private microphone: Microphone;
  private accelerometer: Accelerometer;
  radio: Radio;

  // Perhaps we can remove this?
  public serialInputBuffer: number[] = [];

  public sensors: Sensor[];
  private sensorsById: Map<string, Sensor>;

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
    const onSensorChange = () =>
      this.notifications.onSensorsChange(this.sensors);
    this.buttons = [
      new Button(
        this.svg.querySelector("#ButtonA")!,
        "buttonA",
        onSensorChange
      ),
      new Button(
        this.svg.querySelector("#ButtonB")!,
        "buttonB",
        onSensorChange
      ),
    ];
    this.pins = Array(33);
    this.pins[MICROBIT_HAL_PIN_FACE] = new Pin(
      this.svg.querySelector("#Logo")!,
      "pinLogo",
      onSensorChange
    );
    this.pins[MICROBIT_HAL_PIN_P0] = new Pin(null, "pin0", onSensorChange);
    this.pins[MICROBIT_HAL_PIN_P1] = new Pin(null, "pin1", onSensorChange);
    this.pins[MICROBIT_HAL_PIN_P2] = new Pin(null, "pin2", onSensorChange);
    this.audio = new Audio();
    this.temperature = new RangeSensor("temperature", -5, 50, 21, "°C");
    this.accelerometer = new Accelerometer(onSensorChange);
    this.microphone = new Microphone(
      this.svg.querySelector("#LitMicrophone")!,
      onSensorChange
    );
    this.radio = new Radio(
      this.notifications.onRadioOutput.bind(this.notifications),
      this.ticksMilliseconds.bind(this)
    );

    this.sensors = [
      this.display.lightLevel,
      this.temperature,
      this.microphone.soundLevel,
      this.buttons[0].button,
      this.buttons[1].button,
      this.pins[MICROBIT_HAL_PIN_FACE].pin,
      this.pins[MICROBIT_HAL_PIN_P0].pin,
      this.pins[MICROBIT_HAL_PIN_P1].pin,
      this.pins[MICROBIT_HAL_PIN_P2].pin,
      ...this.accelerometer.sensors,
    ];
    this.sensorsById = new Map();
    this.sensors.forEach((sensor) => {
      this.sensorsById.set(sensor.id, sensor);
    });
    this.stoppedOverlay = document.querySelector(".play-button-container")!;
    this.playButton = document.querySelector(".play-button")!;
    this.initializePlayButton();
    // We start stopped.
    this.displayStoppedState();
    this.playButton.addEventListener("click", () =>
      window.parent.postMessage(
        {
          kind: "request_flash",
        },
        "*"
      )
    );
  }

  getSensor(id: string): Sensor | undefined {
    return this.sensorsById.get(id);
  }

  initializedWebAssembly() {
    this.operations.initialize();
    this.notifications.onReady(this.sensors);
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
    this.microphone.dispose();
    this.radio.dispose();
    this.serialInputBuffer.length = 0;
  }
}

export class Notifications {
  constructor(private target: Pick<Window, "postMessage">) {}

  onReady(sensors: Sensor[]) {
    this.postMessage("ready", {
      sensors: sensors.map((s) => s.toSerializable()),
    });
  }

  onSensorsChange(sensors: Sensor[]) {
    this.postMessage("sensor_change", {
      sensors: sensors.map((s) => s.toSerializable()),
    });
  }

  onSerialOutput(data: string) {
    this.postMessage("serial_output", { data });
  }

  onRadioOutput(data: Uint8Array) {
    this.postMessage("radio_output", { data });
  }

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
