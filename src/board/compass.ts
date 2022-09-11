import { RangeSensor, State } from "./state";

type StateKeys = "compassX" | "compassY" | "compassZ" | "compassHeading";

export class Compass {
  state: Pick<State, "compassX" | "compassY" | "compassZ" | "compassHeading">;

  constructor() {
    const min = -2_000_000;
    const max = 2_000_000;
    this.state = {
      compassX: new RangeSensor("compassX", min, max, 0, "nT"),
      compassY: new RangeSensor("compassY", min, max, 0, "nT"),
      compassZ: new RangeSensor("compassZ", min, max, 0, "nT"),
      compassHeading: new RangeSensor("compassHeading", 0, 360, 0, "deg"),
    };
  }

  setValue(id: StateKeys, value: any) {
    this.state[id].setValue(value);
  }

  getFieldStrength() {
    const x = this.state.compassX.value;
    const y = this.state.compassY.value;
    const z = this.state.compassZ.value;
    return Math.sqrt(x * x + y * y + z * z);
  }

  boardStopped() {}
}
