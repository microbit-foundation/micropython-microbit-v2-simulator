export abstract class Sensor {
  constructor(public type: string, public id: string) {}

  abstract setValue(value: any): void;

  /**
   * @returns A representation of the sensor that is serializable (for postMessage).
   */
  toSerializable(): object {
    return this;
  }

  protected valueError(value: any) {
    return new Error(
      `${this.id} given invalid value: ${JSON.stringify(value)}`
    );
  }
}

export class RangeSensor extends Sensor {
  public value: number;
  public onchange?: (prev: number, curr: number) => void = () => {};
  constructor(
    id: string,
    public min: number,
    public max: number,
    public initial: number,
    public unit: string | undefined
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
    const prev = this.value;
    this.value = proposed;
    if (this.onchange) {
      this.onchange(prev, this.value);
    }
  }

  toSerializable() {
    return {
      type: "range",
      id: this.id,
      min: this.min,
      max: this.max,
      value: this.value,
      unit: this.unit,
    };
  }
}

export class EnumSensor extends Sensor {
  public value: string;
  public onchange: (v: string) => void = () => {};

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
    this.onchange(value);
  }

  toSerializable() {
    return {
      type: "enum",
      id: this.id,
      choices: this.choices,
      value: this.value,
    };
  }
}
