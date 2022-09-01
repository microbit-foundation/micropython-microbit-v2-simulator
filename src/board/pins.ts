import { RangeSensor, State } from "./state";

export class Pin {
  state: RangeSensor;

  private _mouseDown: boolean = false;

  private keyListener: (e: KeyboardEvent) => void;
  private mouseDownListener: (e: MouseEvent) => void;
  private mouseUpListener: (e: MouseEvent) => void;
  private mouseLeaveListener: (e: MouseEvent) => void;

  constructor(
    private id: "pin0" | "pin1" | "pin2" | "pinLogo",
    private element: SVGElement | null,
    label: string | null,
    private onChange: (changes: Partial<State>) => void
  ) {
    if ((element ? 0 : 1) + (label ? 0 : 1) === 1) {
      throw new Error("Must provide element and label or neither");
    }
    this.state = new RangeSensor(id, 0, 1, 0, undefined);

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
            this.press();
          } else {
            this.release();
          }
      }
    };

    this.mouseDownListener = (e) => {
      e.preventDefault();
      this._mouseDown = true;
      this.press();
    };
    this.mouseUpListener = (e) => {
      e.preventDefault();
      if (this._mouseDown) {
        this._mouseDown = false;
        this.release();
      }
    };
    this.mouseLeaveListener = (e) => {
      if (this._mouseDown) {
        this._mouseDown = false;
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

  setValue(value: any) {
    this.setValueInternal(value, false);
  }

  private setValueInternal(value: any, internalChange: boolean) {
    this.state.setValue(value);
    if (internalChange) {
      this.onChange({
        [this.id]: this.state,
      });
    }
    this.render();
  }

  press() {
    this.setValueInternal(
      this.state.value === this.state.min ? this.state.max : this.state.min,
      true
    );
  }

  release() {
    this.setValueInternal(
      this.state.value === this.state.max ? this.state.min : this.state.max,
      true
    );
  }

  isTouched() {
    return !!this.state.value;
  }

  render() {
    if (this.element) {
      const fill = !!this.state.value ? "red" : "url(#an)";
      this.element.querySelectorAll("path").forEach((p) => {
        p.style.fill = fill;
      });
    }
  }

  initialize() {}

  dispose() {}
}
