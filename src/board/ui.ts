// Matches microbithal.h

import { EnumSensor, RangeSensor, Sensor } from "./sensors";
import { clamp } from "./util";
import svgText from "../microbit-drawing.svg";
import playIcon from "../microbit-face-icon.svg";
import { MICROBIT_HAL_PIN_FACE } from "./constants";
import { AudioUI } from "./audio";
import { WebAssemblyOperations } from "./listener";
import { FileSystem } from "./fs";
import { convertAccelerometerStringToNumber } from "./conversions";

const stoppedOpactity = "0.5";

export function createBoard(
  operations: WebAssemblyOperations,
  fs: FileSystem,
  onSensorChange: () => void
) {
  document.body.insertAdjacentHTML("afterbegin", svgText);
  const svg = document.querySelector("svg");
  if (!svg) {
    throw new Error("No SVG");
  }
  const playButton = createPlayButton();
  svg.insertAdjacentElement("afterend", playButton);
  return new BoardUI(operations, fs, svg, playButton, onSensorChange);
}

function createPlayButton() {
  const playButton = document.createElement("button");
  playButton.classList.add("play-button");
  const iconContainer = document.createElement("div");
  iconContainer.classList.add("play-icon-container");
  iconContainer.insertAdjacentHTML("beforeend", playIcon);
  playButton.appendChild(iconContainer);
  return playButton;
}

export class BoardUI {
  private display: DisplayUI;
  private buttons: ButtonUI[];
  private pins: PinUI[];
  private audio = new AudioUI();
  private temperature: RangeSensor;
  private accelerometer: AccelerometerUI;

  // Perhaps we can remove this?
  public serialInputBuffer: number[] = [];

  public sensors: Sensor[];
  private sensorsById: Map<string, Sensor>;

  constructor(
    private operations: WebAssemblyOperations,
    private fs: FileSystem,
    private svg: SVGElement,
    private playButton: HTMLButtonElement,
    onSensorChange: () => void
  ) {
    this.display = new DisplayUI(
      Array.from(this.svg.querySelector("#LEDsOn")!.querySelectorAll("use"))
    );
    this.buttons = [
      new ButtonUI(this.svg.querySelector("#ButtonA")!, "A"),
      new ButtonUI(this.svg.querySelector("#ButtonB")!, "B"),
    ];
    this.pins = Array(33);
    this.pins[MICROBIT_HAL_PIN_FACE] = new PinUI(
      this.svg.querySelector("#Logo")!,
      "pin_logo"
    );
    this.audio = new AudioUI();
    this.temperature = new RangeSensor("temperature", -5, 50, 21, "°C");
    this.accelerometer = new AccelerometerUI(onSensorChange);

    this.sensors = [
      this.display.lightLevel,
      this.temperature,
      ...this.accelerometer.sensors,
    ];
    this.sensorsById = new Map();
    this.sensors.forEach((sensor) => {
      this.sensorsById.set(sensor.id, sensor);
    });
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
  }

  initialize() {
    this.audio.initialize({
      defaultAudioCallback: this.operations.defaultAudioCallback!,
      speechAudioCallback: this.operations.speechAudioCallback!,
    });
    this.buttons.forEach((b) => b.initialize());
    this.pins.forEach((p) => p.initialize());
    this.display.initialize();
    this.accelerometer.initialize(this.operations.gestureCallback!);
    this.serialInputBuffer.length = 0;
  }

  private displayRunningState() {
    this.svg.style.opacity = "unset";
    const svgButtons = this.svg.querySelectorAll("[role='button']");
    for (const button of svgButtons) {
      button.setAttribute("tabindex", "0");
    }
    this.playButton.style.display = "none";
  }

  private displayStoppedState() {
    this.svg.style.opacity = stoppedOpactity;
    const svgButtons = this.svg.querySelectorAll("[role='button']");
    for (const button of svgButtons) {
      button.setAttribute("tabindex", "-1");
    }
    this.playButton.style.display = "flex";
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

  writeSerial(text: string) {
    for (let i = 0; i < text.length; i++) {
      this.serialInputBuffer.push(text.charCodeAt(i));
    }
  }

  /**
   * Read a character code from the serial buffer or -1 if none.
   */
  readSerial(): number {
    return this.serialInputBuffer.shift() ?? -1;
  }

  dispose() {
    this.audio.dispose();
    this.buttons.forEach((b) => b.dispose());
    this.pins.forEach((p) => p.dispose());
    this.display.dispose();
    this.accelerometer.dispose();
    this.serialInputBuffer.length = 0;
  }
}

// This mapping is designed to give a set of 10 visually distinct levels.
// Carried across from microbit_hal_display_set_pixel.
const brightMap = [0, 20, 40, 60, 80, 120, 160, 190, 220, 255];

export class DisplayUI {
  public lightLevel: RangeSensor = new RangeSensor(
    "lightLevel",
    0,
    255,
    127,
    undefined
  );
  private state: Array<Array<number>>;
  constructor(private leds: SVGElement[]) {
    this.leds = leds;
    this.state = this.initialState();
  }

  initialState() {
    return [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];
  }

  clear() {
    this.state = this.initialState();
    this.render();
  }

  setPixel(x: number, y: number, value: number) {
    value = clamp(value, 0, 9);
    this.state[x][y] = value;
    this.render();
  }

  getPixel(x: number, y: number) {
    return this.state[x][y];
  }

  render() {
    for (let x = 0; x < 5; ++x) {
      for (let y = 0; y < 5; ++y) {
        const on = this.state[x][y];
        const led = this.leds[x * 5 + y];
        if (on) {
          const bright = brightMap[this.state[x][y]];
          led.style.display = "inline";
          led.style.opacity = (bright / 255).toString();
        } else {
          led.style.display = "none";
        }
      }
    }
  }

  initialize() {}

  dispose() {
    this.clear();
  }
}

export class ButtonUI {
  private _isPressed: boolean = false;
  private _presses: number = 0;
  private keyListener: (e: KeyboardEvent) => void;
  private mouseDownListener: (e: MouseEvent) => void;
  private mouseUpListener: (e: MouseEvent) => void;
  private mouseLeaveListener: (e: MouseEvent) => void;

  constructor(private element: SVGElement, label: string) {
    this._isPressed = false;
    this._presses = 0;

    this.element.setAttribute("role", "button");
    this.element.setAttribute("tabindex", "0");
    this.element.ariaLabel = label;
    this.element.style.cursor = "pointer";

    this.keyListener = (e) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (e.type === "keydown") {
            this.press();
          } else {
            this.release();
          }
      }
    };

    this.mouseDownListener = (e) => {
      e.preventDefault();
      this.press();
    };
    this.mouseUpListener = (e) => {
      e.preventDefault();
      this.release();
    };
    this.mouseLeaveListener = (e) => {
      this.release();
    };

    this.element.addEventListener("mousedown", this.mouseDownListener);
    this.element.addEventListener("mouseup", this.mouseUpListener);
    this.element.addEventListener("keydown", this.keyListener);
    this.element.addEventListener("keyup", this.keyListener);
    this.element.addEventListener("mouseleave", this.mouseLeaveListener);
  }

  press() {
    this._isPressed = true;
    this._presses++;

    this.render();
  }

  release() {
    this._isPressed = false;

    this.render();
  }

  isPressed() {
    return this._isPressed;
  }

  render() {
    const fill = this._isPressed ? "#d3b12c" : "none";
    this.element.querySelectorAll("circle").forEach((c) => {
      c.style.fill = fill;
    });
  }

  getAndClearPresses() {
    const result = this._presses;
    this._presses = 0;
    return result;
  }

  initialize() {}

  dispose() {}
}

export class AccelerometerUI {
  private gesture: EnumSensor;
  private x: RangeSensor;
  private y: RangeSensor;
  private z: RangeSensor;
  constructor(private onSensorChange: () => void) {
    this.gesture = new EnumSensor(
      "gesture",
      [
        "none",
        "up",
        "down",
        "left",
        "right",
        "face up",
        "face down",
        "freefall",
        "3g",
        "6g",
        "8g",
        "shake",
      ],
      "none"
    );
    const min = -2000;
    const max = 2000;
    this.x = new RangeSensor("accelerometerX", min, max, 0, "mg");
    this.y = new RangeSensor("accelerometerY", min, max, 0, "mg");
    this.z = new RangeSensor("accelerometerZ", min, max, 0, "mg");
  }

  get sensors() {
    return [this.gesture, this.x, this.y, this.z];
  }

  setRange(range: number) {
    const min = -1000 * range;
    const max = +1000 * range;
    for (const sensor of [this.x, this.y, this.z]) {
      sensor.value = clamp(sensor.value, min, max);
      sensor.min = min;
      sensor.max = max;
    }
    this.onSensorChange();
  }

  initialize(gestureCallback: (v: number) => void) {
    this.gesture.onchange = (v: string) =>
      gestureCallback(convertAccelerometerStringToNumber(v));
  }

  dispose() {}
}

export class PinUI {
  private _isTouched: boolean;
  private keyListener: (e: KeyboardEvent) => void;
  private mouseDownListener: (e: MouseEvent) => void;
  private mouseUpListener: (e: MouseEvent) => void;
  private mouseLeaveListener: (e: MouseEvent) => void;

  constructor(private element: SVGElement, private label: string) {
    this.label = label;
    this._isTouched = false;

    this.element = element;
    this.element.setAttribute("role", "button");
    this.element.setAttribute("tabindex", "0");
    this.element.ariaLabel = label;
    this.element.style.cursor = "pointer";

    this.keyListener = (e) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (e.type === "keydown") {
            this.press();
          } else {
            this.release();
          }
      }
    };

    this.mouseDownListener = (e) => {
      e.preventDefault();
      this.press();
    };
    this.mouseUpListener = (e) => {
      e.preventDefault();
      this.release();
    };
    this.mouseLeaveListener = (e) => {
      this.release();
    };

    this.element.addEventListener("mousedown", this.mouseDownListener);
    this.element.addEventListener("mouseup", this.mouseUpListener);
    this.element.addEventListener("keydown", this.keyListener);
    this.element.addEventListener("keyup", this.keyListener);
    this.element.addEventListener("mouseleave", this.mouseLeaveListener);
  }

  press() {
    this._isTouched = true;
    this.render();
  }

  release() {
    this._isTouched = false;
    this.render();
  }

  isTouched() {
    return this._isTouched;
  }

  render() {
    const fill = this._isTouched ? "red" : "url(#an)";
    this.element.querySelectorAll("path").forEach((p) => {
      p.style.fill = fill;
    });
  }

  initialize() {}

  dispose() {}
}
