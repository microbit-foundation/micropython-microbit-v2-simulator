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
      const low = this.soundLevel.lowThreshold!;
      const high = this.soundLevel.highThreshold!;
      if (prev > low && curr <= low) {
        soundLevelCallback(convertSoundEventStringToNumber("low"));
      } else if (prev < high && curr >= high!) {
        soundLevelCallback(convertSoundEventStringToNumber("high"));
      }
    };
  }

  dispose() {
    this.microphoneOff();
  }
}
