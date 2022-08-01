export class Sensor {
  constructor(public type: string, public id: string) {}

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
