import { convertAccelerometerStringToNumber } from "./conversions";
import { EnumSensor, RangeSensor } from "./sensors";
import { clamp } from "./util";

export class Accelerometer {
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
