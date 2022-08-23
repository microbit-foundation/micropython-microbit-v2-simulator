// Matches microbithal.h

import svgText from "../microbit-drawing.svg";
import { AudioUI } from "./audio";
import {
  MICROBIT_HAL_PIN_FACE,
  MICROBIT_HAL_PIN_P0,
  MICROBIT_HAL_PIN_P1,
  MICROBIT_HAL_PIN_P2,
} from "./constants";
import {
  convertAccelerometerStringToNumber,
  convertSoundEventStringToNumber,
} from "./conversions";
import { FileSystem } from "./fs";
import { WebAssemblyOperations } from "./listener";
import {
  EnumSensor,
  RangeSensor,
  RangeSensorWithThresholds,
  Sensor,
} from "./sensors";
import { clamp } from "./util";

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
  return new BoardUI(operations, fs, svg, onSensorChange);
}

export class BoardUI {
  private display: DisplayUI;
  private buttons: ButtonUI[];
  private pins: PinUI[];
  private audio = new AudioUI();
  private temperature: RangeSensor;
  private microphone: MicrophoneUI;
  private accelerometer: AccelerometerUI;
  radio: RadioUI;

  // Perhaps we can remove this?
  public serialInputBuffer: number[] = [];

  public sensors: Sensor[];
  private sensorsById: Map<string, Sensor>;

  private stoppedOverlay: HTMLDivElement;
  private playButton: HTMLButtonElement;

  private epoch: number | undefined;

  constructor(
    public operations: WebAssemblyOperations,
    private fs: FileSystem,
    private svg: SVGElement,
    onSensorChange: () => void
  ) {
    this.display = new DisplayUI(
      Array.from(this.svg.querySelector("#LEDsOn")!.querySelectorAll("use"))
    );
    this.buttons = [
      new ButtonUI(
        this.svg.querySelector("#ButtonA")!,
        "buttonA",
        onSensorChange
      ),
      new ButtonUI(
        this.svg.querySelector("#ButtonB")!,
        "buttonB",
        onSensorChange
      ),
    ];
    this.pins = Array(33);
    this.pins[MICROBIT_HAL_PIN_FACE] = new PinUI(
      this.svg.querySelector("#Logo")!,
      "pinLogo",
      onSensorChange
    );
    this.pins[MICROBIT_HAL_PIN_P0] = new PinUI(null, "pin0", onSensorChange);
    this.pins[MICROBIT_HAL_PIN_P1] = new PinUI(null, "pin1", onSensorChange);
    this.pins[MICROBIT_HAL_PIN_P2] = new PinUI(null, "pin2", onSensorChange);
    this.audio = new AudioUI();
    this.temperature = new RangeSensor("temperature", -5, 50, 21, "°C");
    this.accelerometer = new AccelerometerUI(onSensorChange);
    this.microphone = new MicrophoneUI(
      this.svg.querySelector("#LitMicrophone")!,
      onSensorChange
    );
    this.radio = new RadioUI(this.ticksMilliseconds.bind(this));

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
    this.microphone.dispose();
    this.radio.dispose();
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
  public button: RangeSensor;
  private _presses: number = 0;
  private _mouseDown: boolean = false;
  private _internalChange: boolean = false;
  private keyListener: (e: KeyboardEvent) => void;
  private mouseDownListener: (e: MouseEvent) => void;
  private mouseUpListener: (e: MouseEvent) => void;
  private mouseLeaveListener: (e: MouseEvent) => void;

  constructor(
    private element: SVGElement,
    label: string,
    private onSensorChange: () => void
  ) {
    this._presses = 0;
    this.button = new RangeSensor(label, 0, 1, 0, undefined);
    this.button.onchange = (_, curr: number): void => {
      if (this._internalChange == true) {
        this.onSensorChange();
        this._internalChange = false;
      }
      if (curr) {
        this._presses++;
      }
      this.render();
    };

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
            this._internalChange = true;
            this.press();
          } else {
            this._internalChange = true;
            this.release();
          }
      }
    };

    this.mouseDownListener = (e) => {
      e.preventDefault();
      this._mouseDown = true;
      this._internalChange = true;
      this.press();
    };
    this.mouseUpListener = (e) => {
      e.preventDefault();
      if (this._mouseDown) {
        this._mouseDown = false;
        this._internalChange = true;
        this.release();
      }
    };
    this.mouseLeaveListener = (e) => {
      if (this._mouseDown) {
        this._mouseDown = false;
        this._internalChange = true;
        this.release();
      }
    };

    this.element.addEventListener("mousedown", this.mouseDownListener);
    this.element.addEventListener("mouseup", this.mouseUpListener);
    this.element.addEventListener("keydown", this.keyListener);
    this.element.addEventListener("keyup", this.keyListener);
    this.element.addEventListener("mouseleave", this.mouseLeaveListener);
  }

  press() {
    this.button.setValue(
      this.button.value === this.button.min ? this.button.max : this.button.min
    );
  }

  release() {
    this.button.setValue(
      this.button.value === this.button.max ? this.button.min : this.button.max
    );
  }

  isPressed() {
    return !!this.button.value;
  }

  render() {
    const fill = !!this.button.value ? "#d3b12c" : "none";
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

  dispose() {
    this._presses = 0;
  }
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

export class MicrophoneUI {
  public soundLevel: RangeSensorWithThresholds = new RangeSensorWithThresholds(
    "soundLevel",
    0,
    255,
    0,
    undefined,
    75,
    150
  );

  constructor(
    private element: SVGElement,
    private onSensorChange: () => void
  ) {}

  microphoneOn() {
    this.element.style.display = "unset";
  }

  private microphoneOff() {
    this.element.style.display = "none";
  }

  setThreshold(threshold: "low" | "high", value: number) {
    const proposed = value > 255 ? 255 : value < 0 ? 0 : value;
    if (threshold === "low") {
      this.soundLevel.lowThreshold = proposed;
    } else {
      this.soundLevel.highThreshold = proposed;
    }
    this.onSensorChange();
  }

  initialize(soundLevelCallback: (v: number) => void) {
    this.soundLevel.onchange = (prev: number, curr: number) => {
      if (
        prev > this.soundLevel.lowThreshold &&
        curr <= this.soundLevel.lowThreshold
      ) {
        soundLevelCallback(convertSoundEventStringToNumber("low"));
      } else if (
        prev < this.soundLevel.highThreshold &&
        curr >= this.soundLevel.highThreshold
      ) {
        soundLevelCallback(convertSoundEventStringToNumber("high"));
      }
    };
  }

  dispose() {
    this.microphoneOff();
  }
}

export class PinUI {
  public pin: RangeSensor;
  private _mouseDown: boolean = false;
  private _internalChange: boolean = false;
  private keyListener: (e: KeyboardEvent) => void;
  private mouseDownListener: (e: MouseEvent) => void;
  private mouseUpListener: (e: MouseEvent) => void;
  private mouseLeaveListener: (e: MouseEvent) => void;

  constructor(
    private element: SVGElement | null,
    label: string,
    private onSensorChange: () => void
  ) {
    this.pin = new RangeSensor(label, 0, 1, 0, undefined);
    this.pin.onchange = (): void => {
      if (this._internalChange == true) {
        this.onSensorChange();
        this._internalChange = false;
      }
      this.render();
    };

    if (this.element) {
      this.element.setAttribute("role", "button");
      this.element.setAttribute("tabindex", "0");
      this.element.ariaLabel = label;
      this.element.style.cursor = "pointer";
    }

    this.keyListener = (e) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (e.type === "keydown") {
            this._internalChange = true;
            this.press();
          } else {
            this._internalChange = true;
            this.release();
          }
      }
    };

    this.mouseDownListener = (e) => {
      e.preventDefault();
      this._mouseDown = true;
      this._internalChange = true;
      this.press();
    };
    this.mouseUpListener = (e) => {
      e.preventDefault();
      if (this._mouseDown) {
        this._mouseDown = false;
        this._internalChange = true;
        this.release();
      }
    };
    this.mouseLeaveListener = (e) => {
      if (this._mouseDown) {
        this._mouseDown = false;
        this._internalChange = true;
        this.release();
      }
    };

    if (this.element) {
      this.element.addEventListener("mousedown", this.mouseDownListener);
      this.element.addEventListener("mouseup", this.mouseUpListener);
      this.element.addEventListener("keydown", this.keyListener);
      this.element.addEventListener("keyup", this.keyListener);
      this.element.addEventListener("mouseleave", this.mouseLeaveListener);
    }
  }

  press() {
    this.pin.setValue(
      this.pin.value === this.pin.min ? this.pin.max : this.pin.min
    );
  }

  release() {
    this.pin.setValue(
      this.pin.value === this.pin.max ? this.pin.min : this.pin.max
    );
  }

  isTouched() {
    return !!this.pin.value;
  }

  render() {
    if (this.element) {
      const fill = !!this.pin.value ? "red" : "url(#an)";
      this.element.querySelectorAll("path").forEach((p) => {
        p.style.fill = fill;
      });
    }
  }

  initialize() {}

  dispose() {}
}

interface RadioConfig {
  maxPayload: number;
  queue: number;
  group: number;
}

export class RadioUI {
  private rxQueue: Uint8Array[] | undefined;
  private config: RadioConfig | undefined;

  constructor(private ticksMilliseconds: () => number) {}

  peek(): Uint8Array | undefined {
    return this.rxQueue![0];
  }

  pop() {
    this.rxQueue!.shift();
  }

  send(data: Uint8Array) {
    window.parent.postMessage(
      {
        kind: "radio_output",
        data,
      },
      "*"
    );
  }

  receive(data: Uint8Array) {
    if (this.rxQueue!.length === this.config!.queue) {
      // Drop the message as the queue is full.
    } else {
      // Add extra information to make a radio packet in the expected format
      // rather than just data. Clients must prepend \x01\x00\x01 if desired.
      const len = data.length;
      const size =
        1 + // len
        len +
        1 + // RSSI
        4; // time
      const rssi = 127; // This is inverted by modradio.
      const time = this.ticksMilliseconds();

      const packet = new Uint8Array(size);
      packet[0] = len;
      packet.set(data, 1);
      packet[1 + len] = rssi;
      packet[1 + len + 1] = time & 0xff;
      packet[1 + len + 2] = (time >> 8) & 0xff;
      packet[1 + len + 3] = (time >> 16) & 0xff;
      packet[1 + len + 4] = (time >> 24) & 0xff;

      this.rxQueue!.push(packet);
    }
  }

  updateConfig(config: RadioConfig) {
    // This needs to just change the config, not trash the receive queue.
    // This is somewhat odd as you can have a message in the queue from
    // a different radio group.
    if (
      !this.config ||
      config.queue !== this.config.queue ||
      config.group !== this.config.group
    ) {
      throw new Error(
        "If queue or payload change then should call disable/enable."
      );
    }
    this.config = config;
  }

  enable(config: RadioConfig) {
    this.config = config;
    this.rxQueue = [];
  }

  disable() {
    this.rxQueue = undefined;
  }

  initialize() {}

  dispose() {
    this.disable();
  }
}
