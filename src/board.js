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

async function createBoard(onSensorChange) {
  const svgData = await svgPromise;
  if (!svgData) {
    // TODO: add a visual indicator of the failure or inline the resource.
    return null;
  }
  document.body.insertAdjacentHTML("afterbegin", svgData);
  const svg = document.querySelector("svg");
  return new BoardUI(svg, onSensorChange);
}

class BoardUI {
  constructor(svg, onSensorChange) {
    this.svg = svg;
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

  dispose() {
    this.audio.dispose();
    this.buttons.forEach((b) => b.dispose());
    this.display.dispose();
    this.accelerometer.dispose();

    // For now we recreate it.
    // In future we can reset state then update the UI.
    this.svg.remove();
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

  dispose() {}
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

  dispose() {
    this.element.removeEventListener("mouseleave", this.mouseLeaveListener);
    this.element.removeEventListener("keyup", this.keyListener);
    this.element.removeEventListener("keydown", this.keyListener);
    this.element.removeEventListener("mouseup", this.mouseUpListener);
    this.element.removeEventListener("mousedown", this.mouseDownListener);
  }
}

class AudioUI {
  constructor() {
    this._frequency = 440;
    this._context = new AudioContext();
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

  dispose() {
    this._context.close();
    this._oscillator = null;
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
