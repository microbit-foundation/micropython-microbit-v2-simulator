import {
  MICROBIT_HAL_MICROPHONE_EVT_THRESHOLD_HIGH,
  MICROBIT_HAL_MICROPHONE_EVT_THRESHOLD_LOW,
} from "./constants";
import { RangeSensor, State } from "./state";

type SoundLevelCallback = (v: number) => void;

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
  private soundLevelCallback: SoundLevelCallback | undefined;

  constructor(
    private element: SVGElement,
    private onChange: (changes: Partial<State>) => void
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
    this.onChange({
      soundLevel: this.soundLevel,
    });
  }

  setValue(value: number) {
    const prev = this.soundLevel.value;
    const curr = value;
    this.soundLevel.value = value;

    const low = this.soundLevel.lowThreshold!;
    const high = this.soundLevel.highThreshold!;
    if (this.soundLevelCallback) {
      if (prev > low && curr <= low) {
        this.soundLevelCallback(MICROBIT_HAL_MICROPHONE_EVT_THRESHOLD_LOW);
      } else if (prev < high && curr >= high!) {
        this.soundLevelCallback(MICROBIT_HAL_MICROPHONE_EVT_THRESHOLD_HIGH);
      }
    }
  }

  initializeCallbacks(soundLevelCallback: (v: number) => void) {
    this.soundLevelCallback = soundLevelCallback;
  }

  boardStopped() {
    this.microphoneOff();
  }
}
