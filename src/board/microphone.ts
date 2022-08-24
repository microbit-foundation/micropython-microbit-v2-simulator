import { convertSoundEventStringToNumber } from "./conversions";
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
    if (prev > low && curr <= low) {
      this.soundLevelCallback!(convertSoundEventStringToNumber("low"));
    } else if (prev < high && curr >= high!) {
      this.soundLevelCallback!(convertSoundEventStringToNumber("high"));
    }
  }

  initialize(soundLevelCallback: (v: number) => void) {
    this.soundLevelCallback = soundLevelCallback;
  }

  dispose() {
    this.microphoneOff();
    this.soundLevelCallback = undefined;
  }
}
