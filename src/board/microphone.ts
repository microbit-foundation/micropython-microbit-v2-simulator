import { convertSoundEventStringToNumber } from "./conversions";
import { RangeSensor } from "./sensors";

export class Microphone {
  public soundLevel: RangeSensor = new RangeSensor(
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
