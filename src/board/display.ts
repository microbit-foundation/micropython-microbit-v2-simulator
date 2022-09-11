// This mapping is designed to give a set of 10 visually distinct levels.

import { RangeSensor } from "./state";
import { clamp } from "./util";

// Carried across from microbit_hal_display_set_pixel.
const brightMap = [0, 20, 40, 60, 80, 120, 160, 190, 220, 255];

export class Display {
  lightLevel: RangeSensor = new RangeSensor(
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

  /**
   * This is only used for panic. HAL interactions are via setPixel.
   */
  show(image: Array<Array<number>>) {
    for (let y = 0; y < 5; ++y) {
      for (let x = 0; x < 5; ++x) {
        this.state[x][y] = clamp(image[y][x], 0, 9);
      }
    }
    this.render();
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

  boardStopped() {
    this.clear();
  }
}
