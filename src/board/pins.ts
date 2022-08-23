import { RangeSensor } from "./sensors";

export class Pin {
  public pin: RangeSensor;
  private _mouseDown: boolean = false;
  private _internalChange: boolean = false;
  private keyListener: (e: KeyboardEvent) => void;
  private mouseDownListener: (e: MouseEvent) => void;
  private mouseUpListener: (e: MouseEvent) => void;
  private mouseLeaveListener: (e: MouseEvent) => void;

  constructor(
    private element: SVGElement | null,
    label: string,
    private onSensorChange: () => void
  ) {
    this.pin = new RangeSensor(label, 0, 1, 0, undefined);
    this.pin.onchange = (): void => {
      if (this._internalChange == true) {
        this.onSensorChange();
        this._internalChange = false;
      }
      this.render();
    };

    if (this.element) {
      this.element.setAttribute("role", "button");
      this.element.setAttribute("tabindex", "0");
      this.element.ariaLabel = label;
      this.element.style.cursor = "pointer";
    }

    this.keyListener = (e) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (e.type === "keydown") {
            this._internalChange = true;
            this.press();
          } else {
            this._internalChange = true;
            this.release();
          }
      }
    };

    this.mouseDownListener = (e) => {
      e.preventDefault();
      this._mouseDown = true;
      this._internalChange = true;
      this.press();
    };
    this.mouseUpListener = (e) => {
      e.preventDefault();
      if (this._mouseDown) {
        this._mouseDown = false;
        this._internalChange = true;
        this.release();
      }
    };
    this.mouseLeaveListener = (e) => {
      if (this._mouseDown) {
        this._mouseDown = false;
        this._internalChange = true;
        this.release();
      }
    };

    if (this.element) {
      this.element.addEventListener("mousedown", this.mouseDownListener);
      this.element.addEventListener("mouseup", this.mouseUpListener);
      this.element.addEventListener("keydown", this.keyListener);
      this.element.addEventListener("keyup", this.keyListener);
      this.element.addEventListener("mouseleave", this.mouseLeaveListener);
    }
  }

  press() {
    this.pin.setValue(
      this.pin.value === this.pin.min ? this.pin.max : this.pin.min
    );
  }

  release() {
    this.pin.setValue(
      this.pin.value === this.pin.max ? this.pin.min : this.pin.max
    );
  }

  isTouched() {
    return !!this.pin.value;
  }

  render() {
    if (this.element) {
      const fill = !!this.pin.value ? "red" : "url(#an)";
      this.element.querySelectorAll("path").forEach((p) => {
        p.style.fill = fill;
      });
    }
  }

  initialize() {}

  dispose() {}
}
