import { convertAccelerometerStringToNumber } from "./conversions";
import { EnumSensor, RangeSensor, State } from "./state";
import { clamp } from "./util";

type StateKeys =
  | "accelerometerX"
  | "accelerometerY"
  | "accelerometerZ"
  | "gesture";

type GestureCallback = (v: number) => void;

export class Accelerometer {
  state: Pick<
    State,
    "accelerometerX" | "accelerometerY" | "accelerometerZ" | "gesture"
  >;

  private gestureCallback: GestureCallback | undefined;

  constructor(private onChange: (changes: Partial<State>) => void) {
    const min = -2000;
    const max = 2000;
    this.state = {
      accelerometerX: new RangeSensor("accelerometerX", min, max, 0, "mg"),
      accelerometerY: new RangeSensor("accelerometerY", min, max, 0, "mg"),
      accelerometerZ: new RangeSensor("accelerometerZ", min, max, 0, "mg"),
      gesture: new EnumSensor(
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
      ),
    };
  }

  setValue(id: StateKeys, value: any) {
    this.state[id].setValue(value);
    if (id === "gesture" && this.gestureCallback) {
      this.gestureCallback(
        convertAccelerometerStringToNumber(this.state.gesture.value)
      );
    }
  }

  setRange(range: number) {
    const min = -1000 * range;
    const max = +1000 * range;
    const { accelerometerX, accelerometerY, accelerometerZ } = this.state;
    for (const sensor of [accelerometerX, accelerometerY, accelerometerZ]) {
      sensor.value = clamp(sensor.value, min, max);
      sensor.min = min;
      sensor.max = max;
    }
    this.onChange({
      accelerometerX,
      accelerometerY,
      accelerometerZ,
    });
  }

  initializeCallbacks(gestureCallback: GestureCallback) {
    this.gestureCallback = gestureCallback;
  }

  boardStopped() {}
}
