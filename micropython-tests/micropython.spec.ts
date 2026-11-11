/**
 * Runs MicroPython's own tests in the simulator.
 *
 * As with MicroPython's tests/run-tests.py, a test passes if its output
 * matches its .exp file or, when it has none, what CPython prints. The CPython
 * output is checked in under expected/ so that runs don't depend on the local
 * Python. See update-expected.py.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { test as base } from "@playwright/test";
import { createSimulator, expect, Simulator } from "../e2e/fixtures";

const micropythonDir = path.join(
  __dirname,
  "../lib/micropython-microbit-v2/lib/micropython",
);
const testsDir = path.join(micropythonDir, "tests");
const expectedDir = path.join(__dirname, "expected");
// Tests that don't apply to this port, with the reason. Tests that print SKIP
// because a feature is missing skip themselves and aren't listed.
const skip: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(__dirname, "skip.json"), "utf-8"),
);
const manifest: { micropython: string; dirs: string[] } = JSON.parse(
  fs.readFileSync(path.join(expectedDir, "manifest.json"), "utf-8"),
);

// Loading the simulator takes longer than most of these tests, so each worker
// keeps one and flashes it for each test. A test that fails closes it so that
// the next starts clean.
interface SharedSimulator {
  get(): Promise<Simulator>;
  close(): Promise<void>;
}

const test = base.extend<object, { shared: SharedSimulator }>({
  shared: [
    async ({ browser }, use, workerInfo) => {
      let simulator: Simulator | undefined;
      const shared: SharedSimulator = {
        get: async () => {
          if (!simulator) {
            const page = await browser.newPage({
              baseURL: workerInfo.project.use.baseURL,
            });
            simulator = await createSimulator(page, []);
          }
          return simulator;
        },
        close: async () => {
          await simulator?.page.close();
          simulator = undefined;
        },
      };
      await use(shared);
      await shared.close();
    },
    { scope: "worker" },
  ],
});

const importsSiblings = new Set(["import"]);

// What the REPL prints once main.py has finished.
const banner = /MicroPython [^\n]* on [^\n]*\nType "help\(\)"[^\n]*\n>>> $/;

const expectedOutput = (name: string): string | undefined => {
  const candidates = [
    path.join(testsDir, `${name}.exp`),
    path.join(expectedDir, `${name}.exp`),
  ];
  const file = candidates.find((f) => fs.existsSync(f));
  return file === undefined ? undefined : fs.readFileSync(file, "utf-8");
};

// Read from the files as CI runs the tests in a container where git rejects
// the checkout's ownership.
const submoduleCommit = (dir: string): string => {
  const gitFile = fs.readFileSync(path.join(dir, ".git"), "utf-8");
  const gitDir = path.resolve(dir, gitFile.replace(/^gitdir: /, "").trim());
  const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf-8").trim();
  return head.startsWith("ref: ")
    ? fs.readFileSync(path.join(gitDir, head.slice(5)), "utf-8").trim()
    : head;
};

test("expected output is for the MicroPython version in use", () => {
  expect(
    manifest.micropython,
    "MicroPython has changed: run micropython-tests/update-expected.py",
  ).toBe(submoduleCommit(micropythonDir));
});

test("skipped tests exist", () => {
  const missing = Object.keys(skip).filter(
    (name) => !fs.existsSync(path.join(testsDir, name)),
  );
  expect(missing).toEqual([]);
});

for (const dir of manifest.dirs) {
  const files = fs
    .readdirSync(path.join(testsDir, dir))
    .filter((f) => f.endsWith(".py"))
    .sort();
  test.describe(dir, () => {
    for (const file of files) {
      const name = `${dir}/${file}`;
      test(file, async ({ shared }) => {
        test.skip(name in skip, skip[name]);
        const expected = expectedOutput(name);
        expect(
          expected,
          "No expected output: run micropython-tests/update-expected.py",
        ).toBeDefined();

        const simulator = await shared.get();
        let actual: string;
        try {
          actual = await run(simulator, dir, file, files);
        } catch (e) {
          await shared.close();
          throw e;
        }
        // The convention for tests that need a feature the port lacks.
        test.skip(actual === "SKIP\n", "Skipped itself");
        expect(actual).toBe(expected);
      });
    }
  });
}

/** Runs a test to completion and returns what it printed. */
async function run(
  simulator: Simulator,
  dir: string,
  file: string,
  files: string[],
): Promise<string> {
  // Tests in these directories import the files alongside them.
  const siblings = importsSiblings.has(dir)
    ? Object.fromEntries(
        files
          .filter((f) => f !== file)
          .map((f) => [
            f,
            fs.readFileSync(path.join(testsDir, dir, f), "utf-8"),
          ]),
      )
    : {};
  await simulator.run(
    fs.readFileSync(path.join(testsDir, dir, file), "utf-8"),
    siblings,
  );
  let serial = "";
  let changedAt = Date.now();
  await expect
    .poll(
      async () => {
        const previous = serial;
        serial = await simulator.serial();
        if (serial !== previous) {
          changedAt = Date.now();
        }
        // An uncaught exception scrolls on the display before the REPL
        // starts. Skip that once the output has gone quiet, so as not to
        // interrupt a test that prints a traceback and carries on.
        if (
          Date.now() - changedAt > 500 &&
          serial.includes("Traceback") &&
          !banner.test(serial)
        ) {
          await simulator.skipErrorScroll();
          changedAt = Date.now();
        }
        return (
          banner.test(serial) || (await simulator.unexpectedErrors()).length > 0
        );
      },
      { timeout: 30_000, intervals: [20, 50, 100, 250] },
    )
    .toBe(true);
  expect(
    await simulator.unexpectedErrors(),
    "Unexpected errors from the simulator",
  ).toEqual([]);
  return serial.replace(banner, "");
}
