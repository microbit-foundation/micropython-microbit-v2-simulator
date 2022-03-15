async function createBoard() {
  const response = await fetch("microbit-drawing.svg");
  if (!response.ok) {
    // TODO: add a visual indicator of the failure or inline the resource.
    return null;
  }
  document.body.insertAdjacentHTML("afterbegin", await response.text());
  const svg = document.querySelector("svg");
  return new BoardUI(svg);
}

class BoardUI {
  
  constructor(svg) {
      this.svg = svg;
      this.display = new DisplayUI(this.svg.querySelector('#LEDsOn').querySelectorAll('use'))
      this.buttons = [
        new ButtonUI(this.svg.querySelector('#ButtonA'), "A"),
        new ButtonUI(this.svg.querySelector('#ButtonB'), "B")
      ]
      this.audio = new AudioUI();

      const sensors = [
        this.display.lightLevel
      ];
      // Temporary, not sure sensor UI belongs here.
      const sensorElt = document.querySelector("#sensors");
      for (const sensor of sensors) {
        if (sensor.type === "range") {
          sensorElt.appendChild(createRangeUI(sensor))
        }
      }
  }

  dispose() {
    this.audio.dispose();
    document.querySelector("#sensors").innerHTML = '';
    this.buttons.forEach(b => b.dispose());
    this.display.dispose();

    // For now we recreate it.
    // In future we can reset state then update the UI.
    this.svg.remove();
  }

}

class DisplayUI {
  constructor(leds) {
      this.leds = leds;
      this.lightLevel = new RangeSensor("lightLevel", 0, 255, 127);
  }

  setPixel(x, y, value) {
      const on = value > 0;
      const led = this.leds[x * 5 + y];
      if (on) {
          led.style.display = "inline";
          led.style.opacity = value / 255;
      } else {
          led.style.display = "none";
      }
  }

  dispose() {
  }
}


class ButtonUI {
  constructor(element, label) {
    this.label = label;
    this._isPressed = false;
    this._presses = 0;

    this.element = element;
    this.element.role = "button";
    this.element.ariaLabel = label;

    this.mouseDownListener = () => {
      this._isPressed = true;
      this._presses++;
    };
    this.mouseUpListener = () => {
      this._isPressed = false;
    };
    this.element.addEventListener("mousedown", this.mouseDownListener);
    this.element.addEventListener("mouseup", this.mouseUpListener);
  }

  dispose() {
    this.element.removeEventListener("mouseup", this.mouseUpListener);
    this.element.removeEventListener("mousedown", this.mouseDownListener);
  }

  isPressed() {
    return this._isPressed;
  }

  getAndClearPresses() {
    const result = this._presses;
    this._presses = 0;
    return result;
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
  }
}


class Sensor {
  constructor(type) {
    this.type = type;
  }
}


class RangeSensor extends Sensor {
  constructor(id, min, max, initial) {
    super("range");
    this.id = id;
    this.min = min;
    this.max = max;
    this.value = initial;
  }
}


const createRangeUI = (sensor) => {
  const { min, max, value, type, id } = sensor;
  const labelElt = document.createElement("label");
  const text = labelElt.appendChild(document.createElement("span"));
  text.innerText = id;
  const input = labelElt.appendChild(document.createElement("input"));
  Object.assign(input, { min, max, value, type })
  input.addEventListener("change", () => {
      sensor.value = input.value;
  })
  return labelElt;
}