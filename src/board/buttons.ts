import { RangeSensor } from "./sensors";

export class Button {
  public button: RangeSensor;
  private _presses: number = 0;
  private _mouseDown: boolean = false;
  private _internalChange: boolean = false;
  private keyListener: (e: KeyboardEvent) => void;
  private mouseDownListener: (e: MouseEvent) => void;
  private mouseUpListener: (e: MouseEvent) => void;
  private mouseLeaveListener: (e: MouseEvent) => void;

  constructor(
    private element: SVGElement,
    label: string,
    private onSensorChange: () => void
  ) {
    this._presses = 0;
    this.button = new RangeSensor(label, 0, 1, 0, undefined);
    this.button.onchange = (_, curr: number): void => {
      if (this._internalChange == true) {
        this.onSensorChange();
        this._internalChange = false;
      }
      if (curr) {
        this._presses++;
      }
      this.render();
    };

    this.element.setAttribute("role", "button");
    this.element.setAttribute("tabindex", "0");
    this.element.ariaLabel = label;
    this.element.style.cursor = "pointer";

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

    this.element.addEventListener("mousedown", this.mouseDownListener);
    this.element.addEventListener("mouseup", this.mouseUpListener);
    this.element.addEventListener("keydown", this.keyListener);
    this.element.addEventListener("keyup", this.keyListener);
    this.element.addEventListener("mouseleave", this.mouseLeaveListener);
  }

  press() {
    this.button.setValue(
      this.button.value === this.button.min ? this.button.max : this.button.min
    );
  }

  release() {
    this.button.setValue(
      this.button.value === this.button.max ? this.button.min : this.button.max
    );
  }

  isPressed() {
    return !!this.button.value;
  }

  render() {
    const fill = !!this.button.value ? "#d3b12c" : "none";
    this.element.querySelectorAll("circle").forEach((c) => {
      c.style.fill = fill;
    });
  }

  getAndClearPresses() {
    const result = this._presses;
    this._presses = 0;
    return result;
  }

  initialize() {}

  dispose() {
    this._presses = 0;
  }
}
