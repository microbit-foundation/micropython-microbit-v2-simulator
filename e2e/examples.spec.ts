import * as fs from "node:fs";
import * as path from "node:path";
import { expect, Simulator, test } from "./fixtures";

const examplesDir = path.join(__dirname, "..", "src", "examples");

interface ExampleSpec {
  /**
   * Checks while the example runs. Examples without one run for a short
   * while and only need to avoid errors.
   */
  check?: (simulator: Simulator) => Promise<void>;
  /** Most examples loop forever. These reach the REPL prompt. */
  finishes?: boolean;
  timeout?: number;
}

const specs: Record<string, ExampleSpec> = {
  accelerometer: {
    check: async (sim) => {
      await sim.setValue("gesture", "shake");
      await sim.expectSerial(/shake/);
    },
  },
  audio: {
    check: (sim) => sim.expectSerial(/play tone at frequency 976/),
  },
  background: {
    finishes: true,
    check: (sim) => sim.expectSerial(/This should be printed/),
  },
  buttons: {
    finishes: true,
    check: async (sim) => {
      await sim.setValue("buttonA", 1);
      await sim.expectSerial(/A\n0\n/);
    },
  },
  compass: {
    check: async (sim) => {
      await sim.setValue("compassHeading", 90);
      await sim.expectSerial(/heading: {2}90/);
    },
  },
  data_logging: {
    check: async (sim) => {
      await sim.waitForMessage("log_output");
    },
  },
  display: { finishes: true, timeout: 30_000 },
  inline_assembler: {},
  microphone: {
    check: async (sim) => {
      await sim.setValue("soundLevel", 123);
      await sim.expectSerial(/\n123\n/);
    },
  },
  music: { finishes: true },
  pin_logo: {},
  radio: {
    check: async (sim) => {
      await sim.waitForState((s) => (s.radio as any)?.enabled === true);
      await sim.radioInput(new TextEncoder().encode("hello"));
      await sim.expectSerial(/b'hello'/);
    },
  },
  random: {
    // machine.reset() at the end runs the program again.
    check: (sim) =>
      sim.expectSerial(/Fixed seed {2}(\d+)\n[\s\S]*Fixed seed {2}\1\n/, {
        timeout: 15_000,
      }),
  },
  sensors: {
    check: async (sim) => {
      await sim.setValue("lightLevel", 200);
      await sim.expectSerial(/\n200\n/);
    },
  },
  sound_effects_builtin: { finishes: true },
  sound_effects_user: { finishes: true },
  speech: { finishes: true },
  stack_size: {
    finishes: true,
    check: (sim) => sim.expectSerial("maximum recursion depth g(): 126"),
  },
  volume: {},
};

const examples = fs
  .readdirSync(examplesDir)
  .filter((f) => f.endsWith(".py"))
  .map((f) => path.basename(f, ".py"));

test("every example has a spec", () => {
  expect(Object.keys(specs).sort()).toEqual(examples.sort());
});

for (const name of examples) {
  const spec = specs[name] ?? {};
  test(`example ${name}`, async ({ simulator }) => {
    const timeout = spec.timeout ?? 15_000;
    test.setTimeout(timeout + 10_000);
    await simulator.run(
      fs.readFileSync(path.join(examplesDir, `${name}.py`), "utf-8"),
    );
    await spec.check?.(simulator);
    if (spec.finishes) {
      await simulator.expectFinished({ timeout });
    } else if (!spec.check) {
      await simulator.page.waitForTimeout(2_000);
    }
    // Errors in the user's program are printed as a traceback.
    expect(await simulator.serial()).not.toMatch(/Traceback/);
  });
}
