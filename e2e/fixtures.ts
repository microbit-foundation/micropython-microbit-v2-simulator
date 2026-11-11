import { expect, FrameLocator, Page, test as base } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { AudioRecording, installAudioRecorder } from "./audio";

const hostHtml = fs.readFileSync(path.join(__dirname, "host.html"));

// Output that means the firmware itself has failed, rather than the user's
// Python raising an exception.
const firmwareFailure = /FATAL:|Aborted\(/;

// From src/board/display.ts, to map LED opacity back to a 0-9 brightness.
const brightMap = [0, 20, 40, 60, 80, 120, 160, 190, 220, 255];

export interface SimulatorOptions {
  simulatorFlags: string[];
  /** Records audio output for {@link Simulator.audio}. */
  recordAudio: boolean;
}

export interface SimulatorMessage {
  kind: string;
  [key: string]: unknown;
}

export class Simulator {
  private started = false;
  private running = false;
  /**
   * Errors matching these don't fail the test. Use for tests that deliberately
   * provoke an error.
   */
  readonly allowedErrors: RegExp[] = [];
  readonly errors: string[] = [];

  constructor(
    readonly page: Page,
    private flags: string[],
  ) {}

  get frame(): FrameLocator {
    return this.page.frameLocator("#simulator");
  }

  async load(): Promise<void> {
    const params = new URLSearchParams(this.flags.map((f) => ["flag", f]));
    await this.page.goto(`/e2e-host.html?${params}`);
    await this.waitForMessage("ready");
    // A server that redirects simulator.html can drop the query string.
    const search = await this.frame
      .locator("body")
      .evaluate(() => location.search);
    expect(
      new URLSearchParams(search).getAll("flag"),
      "The simulator didn't receive its flags",
    ).toEqual(this.flags);
  }

  /**
   * Flash and start a program. The first run goes via the play button, as
   * a user would, which also creates the AudioContext.
   */
  async run(main: string, files: Record<string, string> = {}): Promise<void> {
    const filesystem = { ...files, "main.py": main };
    await this.page.evaluate(
      ({ filesystem, running }) => {
        const w = window as any;
        w.serial = "";
        w.clearSerialOnStop = running;
        w.filesystem = Object.fromEntries(
          Object.entries(filesystem).map(([k, v]) => [
            k,
            new TextEncoder().encode(v),
          ]),
        );
      },
      { filesystem, running: this.running },
    );
    await this.frame.locator("body").evaluate(() => {
      const recording = (window as any).__audioRecording;
      if (recording) {
        recording.chunks = [];
      }
    });
    if (this.started) {
      await this.page.evaluate(() => {
        const w = window as any;
        w.send({ kind: "flash", filesystem: w.filesystem });
      });
    } else {
      await this.frame.locator(".play-button").click();
      // The host sends the flash as soon as it sees this, so messages sent
      // after it reach the simulator after the flash.
      await this.waitForMessage("request_flash");
      this.started = true;
    }
    this.running = true;
  }

  /** Audio output since the last run. Needs the recordAudio option. */
  async audio(): Promise<AudioRecording> {
    const { sampleRate, samples } = await this.frame
      .locator("body")
      .evaluate(() => {
        const recording = (window as any).__audioRecording;
        if (!recording) {
          throw new Error(
            "Audio isn't recorded without the recordAudio option",
          );
        }
        const chunks: Float32Array[] = recording.chunks;
        const samples = new Float32Array(
          chunks.reduce((total, chunk) => total + chunk.length, 0),
        );
        let offset = 0;
        for (const chunk of chunks) {
          samples.set(chunk, offset);
          offset += chunk.length;
        }
        return { sampleRate: recording.sampleRate, samples };
      });
    return new AudioRecording(samples, sampleRate);
  }

  /** Serial output since the last run, with line endings normalised. */
  async serial(): Promise<string> {
    const raw = await this.page.evaluate(() => (window as any).serial);
    return raw.replace(/\r\n/g, "\n");
  }

  async expectSerial(
    expected: string | RegExp,
    options: { timeout?: number } = {},
  ): Promise<void> {
    await expect
      .poll(() => this.serial(), { timeout: options.timeout ?? 10_000 })
      .toMatch(expected);
  }

  /** Waits for the REPL prompt that follows main.py finishing. */
  async expectFinished(options: { timeout?: number } = {}): Promise<void> {
    await this.expectSerial(/>>> $/, options);
  }

  /**
   * After an uncaught exception the error scrolls across the display before
   * the REPL starts. Ctrl-C skips it.
   */
  async skipErrorScroll(): Promise<void> {
    await this.sendSerial("\x03");
    await this.expectFinished();
  }

  /** Length of the serial output since the last run, as sent. */
  async serialLength(): Promise<number> {
    return this.page.evaluate(() => (window as any).serial.length as number);
  }

  async sendSerial(data: string): Promise<void> {
    await this.send({ kind: "serial_input", data });
  }

  async setValue(id: string, value: unknown): Promise<void> {
    await this.send({ kind: "set_value", id, value });
  }

  async radioInput(data: Uint8Array): Promise<void> {
    await this.send({ kind: "radio_input", data });
  }

  /** Stops the program and waits until it has stopped. */
  async stop(): Promise<void> {
    const stopCount = () =>
      this.page.evaluate(() => (window as any).stopCount as number);
    const before = await stopCount();
    await this.send({ kind: "stop" });
    if (this.running) {
      await expect.poll(stopCount).toBeGreaterThan(before);
      this.running = false;
    }
  }

  async mute(): Promise<void> {
    await this.send({ kind: "mute" });
  }

  async unmute(): Promise<void> {
    await this.send({ kind: "unmute" });
  }

  async config(
    language: string,
    translations: Record<string, string>,
  ): Promise<void> {
    await this.send({ kind: "config", language, translations });
  }

  /** Brightness 0-9 of each LED as rows, i.e. display[y][x]. */
  async display(): Promise<number[][]> {
    const opacities = await this.frame
      .locator("#LEDsOn use")
      .evaluateAll((leds: SVGElement[]) =>
        leds.map((led) =>
          led.style.display === "inline" ? Number(led.style.opacity) : 0,
        ),
      );
    // The LEDs are in column order.
    return [0, 1, 2, 3, 4].map((y) =>
      [0, 1, 2, 3, 4].map((x) => {
        const bright = Math.round(opacities[x * 5 + y] * 255);
        return brightMap.findIndex((b) => Math.abs(b - bright) <= 1);
      }),
    );
  }

  /** Waits for the display to show an image in MicroPython's string form. */
  async expectDisplay(
    image: string,
    options: { timeout?: number } = {},
  ): Promise<void> {
    const expected = image
      .replace(/:$/, "")
      .split(":")
      .map((row) => [...row].map(Number));
    await expect
      .poll(() => this.display(), { timeout: options.timeout ?? 10_000 })
      .toEqual(expected);
  }

  async reset(): Promise<void> {
    await this.send({ kind: "reset" });
  }

  async messages(kind?: string): Promise<SimulatorMessage[]> {
    return this.page.evaluate(
      (kind) =>
        (window as any).messages.filter(
          (m: SimulatorMessage) => !kind || m.kind === kind,
        ),
      kind,
    );
  }

  async waitForMessage(
    kind: string,
    options: { timeout?: number } = {},
  ): Promise<SimulatorMessage> {
    await expect
      .poll(async () => (await this.messages(kind)).length, {
        timeout: options.timeout ?? 10_000,
      })
      .toBeGreaterThan(0);
    return (await this.messages(kind))[0];
  }

  /** The board state from the ready message with all later changes applied. */
  async state(): Promise<Record<string, unknown>> {
    let state: Record<string, unknown> = {};
    for (const m of await this.messages()) {
      if (m.kind === "ready") {
        state = { ...(m.state as object) };
      } else if (m.kind === "state_change") {
        state = { ...state, ...(m.change as object) };
      }
    }
    return state;
  }

  async waitForState(
    predicate: (state: Record<string, unknown>) => boolean,
    options: { timeout?: number } = {},
  ): Promise<void> {
    await expect
      .poll(async () => predicate(await this.state()), {
        timeout: options.timeout ?? 10_000,
      })
      .toBe(true);
  }

  private async send(message: SimulatorMessage): Promise<void> {
    await this.page.evaluate((m) => (window as any).send(m), message);
  }

  /** Errors seen so far, including firmware failures in serial output. */
  async unexpectedErrors(): Promise<string[]> {
    const errors = [...this.errors];
    for (const m of await this.messages("internal_error")) {
      errors.push(`internal_error: ${m.error}`);
    }
    const serial = await this.page
      .evaluate(() => (window as any).serial as string)
      .catch(() => "");
    const failure = serial.match(firmwareFailure);
    if (failure) {
      errors.push(`serial: ${serial}`);
    }
    return errors.filter((e) => !this.allowedErrors.some((r) => r.test(e)));
  }
}

/** Loads the simulator in a page, recording console errors and exceptions. */
export const createSimulator = async (
  page: Page,
  flags: string[],
): Promise<Simulator> => {
  // Served by the test rather than the build so it doesn't ship.
  await page.route("**/e2e-host.html*", (route) =>
    route.fulfill({ body: hostHtml, contentType: "text/html" }),
  );
  await page.route("**/favicon.ico", (route) => route.fulfill({ body: "" }));

  const simulator = new Simulator(page, flags);
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      simulator.errors.push(`console: ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    simulator.errors.push(`pageerror: ${error.stack ?? error.message}`);
  });

  await simulator.load();
  return simulator;
};

export const test = base.extend<SimulatorOptions & { simulator: Simulator }>({
  simulatorFlags: [[], { option: true }],
  recordAudio: [false, { option: true }],
  simulator: async ({ page, simulatorFlags, recordAudio }, use) => {
    if (recordAudio) {
      await page.addInitScript(installAudioRecorder);
    }
    const simulator = await createSimulator(page, simulatorFlags);
    await use(simulator);

    expect(
      await simulator.unexpectedErrors(),
      "Unexpected errors from the simulator",
    ).toEqual([]);
  },
});

export { expect };
