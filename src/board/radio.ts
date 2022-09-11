import { RadioState, State } from "./state";

export interface RadioConfig {
  maxPayload: number;
  queue: number;
  group: number;
}

export class Radio {
  private rxQueue: Uint8Array[] | undefined;
  private config: RadioConfig | undefined;
  state: RadioState = { type: "radio", enabled: false, group: 0 };

  constructor(
    private onSend: (data: Uint8Array) => void,
    private onChange: (changes: Partial<State>) => void,
    private ticksMilliseconds: () => number
  ) {}

  peek(): Uint8Array | undefined {
    return this.rxQueue![0];
  }

  pop() {
    this.rxQueue!.shift();
  }

  send(data: Uint8Array) {
    this.onSend(data);
  }

  receive(data: Uint8Array) {
    if (this.rxQueue!.length === this.config!.queue) {
      // Drop the message as the queue is full.
    } else {
      // Truncate at the payload size as we're writing to a fixed size buffer.
      const len = Math.min(data.length, this.config!.maxPayload);
      data = data.slice(0, len);
      // Add extra information to make a radio packet in the expected format
      // rather than just data. Clients must prepend \x01\x00\x01 if desired.
      const size =
        1 + // len
        len +
        1 + // RSSI
        4; // time
      const rssi = 127; // This is inverted by modradio.
      const time = this.ticksMilliseconds();

      const packet = new Uint8Array(size);
      packet[0] = len;
      packet.set(data, 1);
      packet[1 + len] = rssi;
      packet[1 + len + 1] = time & 0xff;
      packet[1 + len + 2] = (time >> 8) & 0xff;
      packet[1 + len + 3] = (time >> 16) & 0xff;
      packet[1 + len + 4] = (time >> 24) & 0xff;

      this.rxQueue!.push(packet);
    }
  }

  updateConfig(config: RadioConfig) {
    // This needs to just change the config, not trash the receive queue.
    // This is somewhat odd as you can have a message in the queue from
    // a different radio group.
    if (
      !this.config ||
      config.queue !== this.config.queue ||
      config.maxPayload !== this.config.maxPayload
    ) {
      throw new Error(
        "If queue or payload change then should call disable/enable."
      );
    }

    if (this.state.group !== config.group) {
      this.state.group = config.group;
      this.onChange({
        radio: this.state,
      });
    }
  }

  enable(config: RadioConfig) {
    this.config = config;
    this.rxQueue = [];
    if (!this.state.enabled) {
      this.state = {
        ...this.state,
        enabled: true,
        group: config.group,
      };
      this.onChange({
        radio: this.state,
      });
    }
  }

  disable() {
    this.rxQueue = undefined;

    if (this.state.enabled) {
      this.state.enabled = false;
      this.onChange({
        radio: this.state,
      });
    }
  }

  boardStopped() {
    this.rxQueue = undefined;
    this.config = undefined;
    this.state = {
      type: "radio",
      enabled: false,
      group: 0,
    };
  }
}
