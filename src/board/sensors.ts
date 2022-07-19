export class Sensor {
  constructor(public type: string, public id: string) {}
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
}

export class EnumSensor extends Sensor {
  public value: string;
  constructor(id: string, public choices: string[], initial: string) {
    super("enum", id);
    this.id = id;
    this.choices = choices;
    this.value = initial;
  }
}
