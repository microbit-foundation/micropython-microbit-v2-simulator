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
import { expect, test } from "../e2e/fixtures";
import { skip } from "./skip";

const micropythonDir = path.join(
  __dirname,
  "../lib/micropython-microbit-v2/lib/micropython",
);
const testsDir = path.join(micropythonDir, "tests");
const expectedDir = path.join(__dirname, "expected");
const manifest: { micropython: string; dirs: string[] } = JSON.parse(
  fs.readFileSync(path.join(expectedDir, "manifest.json"), "utf-8"),
);

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
      test(file, async ({ simulator }) => {
        test.skip(name in skip, skip[name]);
        const expected = expectedOutput(name);
        expect(
          expected,
          "No expected output: run micropython-tests/update-expected.py",
        ).toBeDefined();

        await simulator.run(
          fs.readFileSync(path.join(testsDir, name), "utf-8"),
        );
        let previous = "";
        let serial = "";
        await expect
          .poll(
            async () => {
              serial = await simulator.serial();
              // An uncaught exception scrolls on the display before the REPL
              // starts. Skip that once the output has gone quiet, so as not
              // to interrupt a test that prints a traceback and carries on.
              if (
                serial === previous &&
                serial.includes("Traceback") &&
                !banner.test(serial)
              ) {
                await simulator.skipErrorScroll();
              }
              previous = serial;
              return (
                banner.test(serial) ||
                (await simulator.unexpectedErrors()).length > 0
              );
            },
            { timeout: 30_000, intervals: [100, 250, 500, 1000] },
          )
          .toBe(true);
        const actual = serial.replace(banner, "");
        // The convention for tests that need a feature the port lacks.
        test.skip(actual === "SKIP\n", "Skipped itself");
        expect(actual).toBe(expected);
      });
    }
  });
}
