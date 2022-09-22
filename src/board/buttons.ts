import { RangeSensor, State } from "./state";

export class Button {
  public state: RangeSensor;

  private _presses: number = 0;
  private _mouseDown: boolean = false;

  private keyListener: (e: KeyboardEvent) => void;
  private mouseDownListener: (e: MouseEvent) => void;
  private touchStartListener: (e: TouchEvent) => void;
  private mouseUpTouchEndListener: (e: MouseEvent | TouchEvent) => void;
  private mouseLeaveListener: (e: MouseEvent) => void;

  constructor(
    private id: "buttonA" | "buttonB",
    private element: SVGElement,
    private label: () => string,
    private onChange: (change: Partial<State>) => void
  ) {
    this._presses = 0;
    this.state = new RangeSensor(id, 0, 1, 0, undefined);

    this.element.setAttribute("role", "button");
    this.element.setAttribute("tabindex", "0");
    this.element.style.cursor = "pointer";

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
      this.mouseDownTouchStartAction();
    };
    this.touchStartListener = (e) => {
      this.mouseDownTouchStartAction();
    };
    this.mouseUpTouchEndListener = (e) => {
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

    this.element.addEventListener("mousedown", this.mouseDownListener);
    this.element.addEventListener("touchstart", this.touchStartListener);
    this.element.addEventListener("mouseup", this.mouseUpTouchEndListener);
    this.element.addEventListener("touchend", this.mouseUpTouchEndListener);
    this.element.addEventListener("keydown", this.keyListener);
    this.element.addEventListener("keyup", this.keyListener);
    this.element.addEventListener("mouseleave", this.mouseLeaveListener);
  }

  updateTranslations() {
    this.element.ariaLabel = this.label();
  }

  setValue(value: any) {
    this.setValueInternal(value, false);
  }

  private setValueInternal(value: any, internalChange: boolean) {
    this.state.setValue(value);
    if (value) {
      this._presses++;
    }
    if (internalChange) {
      this.onChange({
        [this.id]: this.state,
      });
    }
    this.render();
  }

  private mouseDownTouchStartAction() {
    this._mouseDown = true;
    this.press();
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

  isPressed() {
    return !!this.state.value;
  }

  render() {
    const fill = !!this.state.value ? "#00c800" : "#000000";
    this.element.querySelectorAll("circle").forEach((c) => {
      c.style.fill = fill;
    });
  }

  getAndClearPresses() {
    const result = this._presses;
    this._presses = 0;
    return result;
  }

  boardStopped() {
    this._presses = 0;
  }
}
