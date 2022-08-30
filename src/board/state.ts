export interface RadioState {
  type: "radio";
  enabled: boolean;
  group: number;
}

export interface DataLoggingState {
  type: "dataLogging";
  logFull: boolean;
}

export interface State {
  radio: RadioState;

  dataLogging: DataLoggingState;

  accelerometerX: RangeSensor;
  accelerometerY: RangeSensor;
  accelerometerZ: RangeSensor;
  gesture: EnumSensor;

  compassX: RangeSensor;
  compassY: RangeSensor;
  compassZ: RangeSensor;
  compassHeading: RangeSensor;

  pin0: RangeSensor;
  pin1: RangeSensor;
  pin2: RangeSensor;
  pinLogo: RangeSensor;

  temperature: RangeSensor;
  lightLevel: RangeSensor;
  soundLevel: RangeSensor;

  buttonA: RangeSensor;
  buttonB: RangeSensor;
}

export abstract class Sensor {
  constructor(public type: string, public id: string) {}

  abstract setValue(value: any): void;

  protected valueError(value: any) {
    return new Error(
      `${this.id} given invalid value: ${JSON.stringify(value)}`
    );
  }
}

export class RangeSensor extends Sensor {
  public value: number;

  constructor(
    id: string,
    public min: number,
    public max: number,
    initial: number,
    public unit: string | undefined,
    public lowThreshold?: number,
    public highThreshold?: number
  ) {
    super("range", id);
    this.value = initial;
  }

  setValue(value: any): void {
    let proposed: number;
    if (typeof value === "number") {
      proposed = value;
    } else if (typeof value === "string") {
      try {
        proposed = parseInt(value, 10);
      } catch (e) {
        throw this.valueError(value);
      }
    } else {
      throw this.valueError(value);
    }
    if (proposed > this.max || proposed < this.min) {
      throw this.valueError(value);
    }
    this.value = proposed;
  }
}

export class EnumSensor extends Sensor {
  public value: string;

  constructor(id: string, public choices: string[], initial: string) {
    super("enum", id);
    this.id = id;
    this.choices = choices;
    this.value = initial;
  }

  setValue(value: any): void {
    if (typeof value !== "string" || !this.choices.includes(value)) {
      throw this.valueError(value);
    }
    this.value = value;
  }
}
