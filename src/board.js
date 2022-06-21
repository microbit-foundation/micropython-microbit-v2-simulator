// Matches microbithal.h
// These numbers refer to indices in the (private) pin_obj table.
const MICROBIT_HAL_PIN_P0 = 0;
const MICROBIT_HAL_PIN_P1 = 1;
const MICROBIT_HAL_PIN_P2 = 2;
const MICROBIT_HAL_PIN_P3 = 3;
const MICROBIT_HAL_PIN_P4 = 4;
const MICROBIT_HAL_PIN_P5 = 5;
const MICROBIT_HAL_PIN_P6 = 6;
const MICROBIT_HAL_PIN_P7 = 7;
const MICROBIT_HAL_PIN_P8 = 8;
const MICROBIT_HAL_PIN_P9 = 9;
const MICROBIT_HAL_PIN_P10 = 10;
const MICROBIT_HAL_PIN_P11 = 12;
const MICROBIT_HAL_PIN_P12 = 12;
const MICROBIT_HAL_PIN_P13 = 13;
const MICROBIT_HAL_PIN_P14 = 14;
const MICROBIT_HAL_PIN_P15 = 15;
const MICROBIT_HAL_PIN_P16 = 16;
const MICROBIT_HAL_PIN_P19 = 17;
const MICROBIT_HAL_PIN_P20 = 18;
const MICROBIT_HAL_PIN_FACE = 19;
const MICROBIT_HAL_PIN_SPEAKER = 20;
const MICROBIT_HAL_PIN_USB_TX = 30;
const MICROBIT_HAL_PIN_USB_RX = 31;
const MICROBIT_HAL_PIN_MIXER = 33;

// These match the micro:bit v1 constants.
const MICROBIT_HAL_PIN_PULL_UP = 0;
const MICROBIT_HAL_PIN_PULL_DOWN = 1;
const MICROBIT_HAL_PIN_PULL_NONE = 2;

const MICROBIT_HAL_PIN_TOUCH_RESISTIVE = 0;
const MICROBIT_HAL_PIN_TOUCH_CAPACITIVE = 1;

const MICROBIT_HAL_ACCELEROMETER_EVT_NONE = 0;
const MICROBIT_HAL_ACCELEROMETER_EVT_TILT_UP = 1;
const MICROBIT_HAL_ACCELEROMETER_EVT_TILT_DOWN = 2;
const MICROBIT_HAL_ACCELEROMETER_EVT_TILT_LEFT = 3;
const MICROBIT_HAL_ACCELEROMETER_EVT_TILT_RIGHT = 4;
const MICROBIT_HAL_ACCELEROMETER_EVT_FACE_UP = 5;
const MICROBIT_HAL_ACCELEROMETER_EVT_FACE_DOWN = 6;
const MICROBIT_HAL_ACCELEROMETER_EVT_FREEFALL = 7;
const MICROBIT_HAL_ACCELEROMETER_EVT_3G = 8;
const MICROBIT_HAL_ACCELEROMETER_EVT_6G = 9;
const MICROBIT_HAL_ACCELEROMETER_EVT_8G = 10;
const MICROBIT_HAL_ACCELEROMETER_EVT_SHAKE = 11;
const MICROBIT_HAL_ACCELEROMETER_EVT_2G = 12;

const MICROBIT_HAL_MICROPHONE_LEVEL_THRESHOLD_LOW = 1;
const MICROBIT_HAL_MICROPHONE_LEVEL_THRESHOLD_HIGH = 2;

const MICROBIT_HAL_LOG_TIMESTAMP_NONE = 0;
const MICROBIT_HAL_LOG_TIMESTAMP_MILLISECONDS = 1;
const MICROBIT_HAL_LOG_TIMESTAMP_SECONDS = 10;
const MICROBIT_HAL_LOG_TIMESTAMP_MINUTES = 600;
const MICROBIT_HAL_LOG_TIMESTAMP_HOURS = 36000;
const MICROBIT_HAL_LOG_TIMESTAMP_DAYS = 864000;

const svgPromise = (async () => {
  try {
    const response = await fetch("microbit-drawing.svg");
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch (e) {
    return null;
  }
})();

async function createBoard(fs, onSensorChange) {
  const svgData = await svgPromise;
  if (!svgData) {
    // TODO: add a visual indicator of the failure or inline the resource.
    return null;
  }
  document.body.insertAdjacentHTML("afterbegin", svgData);
  const svg = document.querySelector("svg");
  return new BoardUI(fs, svg, onSensorChange);
}

class FileSystem {
  constructor() {
    // Each entry is an FsFile object. The indexes are used as identifiers.
    // When a file is deleted the entry becomes ['', null] and can be reused.
    this._content = [];
  }
  create(name) {
    let free_idx = -1;
    for (let idx = 0; idx < this._content.length; ++idx) {
      if (this._content[idx] === null) {
        free_idx = idx;
      } else if (this._content[idx].name === name) {
        // Truncate existing file and return it.
        this._content[idx].truncate();
        return idx;
      }
    }
    if (free_idx < 0) {
      // Add a new file and return it.
      this._content.push(new FsFile(name));
      return this._content.length - 1;
    } else {
      // Reuse existing slot for the new file.
      this._content[free_idx] = new FsFile(name);
      return free_idx;
    }
  }

  find(name) {
    for (let idx = 0; idx < this._content.length; ++idx) {
      if (this._content[idx]?.name === name) {
        return idx;
      }
    }
    return -1;
  }

  name(idx) {
    const file = this._content[idx];
    return file ? file.name : undefined;
  }

  size(idx) {
    const file = this._content[idx];
    if (!file) {
      throw new Error("File must exist");
    }
    return file.size();
  }

  remove(idx) {
    this._content[idx] = null;
  }

  readbyte(idx, offset) {
    const file = this._content[idx];
    return file ? file.readbyte(offset) : -1;
  }

  write(idx, data) {
    const file = this._content[idx];
    if (!file) {
      throw new Error("File must exist");
    }
    file.append(data);
    return data.length;
  }

  clear() {
    for (let idx = 0; idx < this._content.length; ++idx) {
      this.remove(idx);
    }
  }
}

class FsFile {
  constructor(name, buffer) {
    this.name = name;
    this._buffer = buffer ? buffer : new Uint8Array(0);
  }
  readbyte(offset) {
    if (offset < this._buffer.length) {
      return this._buffer[offset];
    }
    return -1;
  }
  append(data) {
    const updated = new Uint8Array(this._buffer.length + data.length);
    updated.set(this._buffer);
    updated.set(data, this._buffer.length);
    this._buffer = updated;
  }
  truncate() {
    this._buffer = new Uint8Array(0);
  }
  size() {
    return this._buffer.length;
  }
}

class BoardUI {
  constructor(fs, svg, onSensorChange) {
    this.svg = svg;
    this.fs = fs;
    this.display = new DisplayUI(
      this.svg.querySelector("#LEDsOn").querySelectorAll("use")
    );
    this.buttons = [
      new ButtonUI(this.svg.querySelector("#ButtonA"), "A"),
      new ButtonUI(this.svg.querySelector("#ButtonB"), "B"),
    ];
    this.audio = new AudioUI();
    this.temperature = new RangeSensor("temperature", -5, 50, 21, "°C");
    this.accelerometer = new AccelerometerUI(onSensorChange);

    this.sensors = [
      this.display.lightLevel,
      this.temperature,
      ...this.accelerometer.sensors,
    ];
    this._sensorsById = {};
    this.sensors.forEach((sensor) => {
      this._sensorsById[sensor.id] = sensor;
    });
  }

  getSensor(id) {
    return this._sensorsById[id];
  }

  initialize() {
    this.audio.initialize();
    this.buttons.forEach((b) => b.initialize());
    this.display.initialize();
    this.accelerometer.initialize();
  }

  dispose() {
    this.audio.dispose();
    this.buttons.forEach((b) => b.dispose());
    this.display.dispose();
    this.accelerometer.dispose();
  }
}

// This mapping is designed to give a set of 10 visually distinct levels.
// Carried across from microbit_hal_display_set_pixel.
const brightMap = [0, 20, 40, 60, 80, 120, 160, 190, 220, 255];

class DisplayUI {
  constructor(leds) {
    this.leds = leds;
    this.lightLevel = new RangeSensor("lightLevel", 0, 255, 127);
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

  setPixel(x, y, value) {
    value = clamp(value, 0, 9);
    this.state[x][y] = value;
    this.render();
  }

  getPixel(x, y) {
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
          led.style.opacity = bright / 255;
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

class ButtonUI {
  constructor(element, label) {
    this.label = label;
    this._isPressed = false;
    this._presses = 0;

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

class AudioUI {
  constructor() {
    this._frequency = 440;
    this._oscillator = null;
  }

  initialize() {
    this._context = new AudioContext();
  }

  dispose() {
    this._context.close();
    this._oscillator = null;
  }

  setPeriodUs(periodUs) {
    this._frequency = 1000000 / periodUs;
    if (this._oscillator) {
      this._oscillator.frequency.value = this._frequency;
    }
  }

  setAmplitudeU10(amplitudeU10) {
    if (this._oscillator) {
      this._oscillator.stop();
      this._oscillator = null;
    }
    if (amplitudeU10) {
      this._oscillator = this._context.createOscillator();
      this._oscillator.type = "sine";
      this._oscillator.connect(this._context.destination);
      this._oscillator.frequency.value = this._frequency;
      this._oscillator.start();
    }
  }
}

class AccelerometerUI {
  constructor(onSensorChange) {
    this.onSensorChange = onSensorChange;
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

  setRange(range) {
    const min = -1000 * range;
    const max = +1000 * range;
    for (const sensor of [this.x, this.y, this.z]) {
      sensor.value = clamp(sensor.value, min, max);
      sensor.min = min;
      sensor.max = max;
    }
    this.onSensorChange();
  }

  initialize() {}

  dispose() {}
}

class Sensor {
  constructor(type, id) {
    this.type = type;
    this.id = id;
  }
}

class RangeSensor extends Sensor {
  constructor(id, min, max, initial, unit) {
    super("range", id);
    this.min = min;
    this.max = max;
    this.value = initial;
    this.unit = unit;
  }
}

class EnumSensor extends Sensor {
  constructor(id, choices, initial) {
    super("enum", id);
    this.id = id;
    this.choices = choices;
    this.value = initial;
  }
}

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
