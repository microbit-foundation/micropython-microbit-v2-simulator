import { expect, Simulator, test } from "./fixtures";

async function logEntries(simulator: Simulator) {
  return (await simulator.messages("log_output")).map(({ headings, data }) => ({
    headings,
    data,
  }));
}

test("logs headings then rows", async ({ simulator }) => {
  await simulator.run(`import log
log.set_labels('a', 'b', timestamp=None)
log.add(a=1, b=2)
log.add({'a': 3, 'b': 4})
log.add(b=5)
print('logged')
`);
  await simulator.expectSerial(/logged/);
  expect(await logEntries(simulator)).toEqual([
    { headings: ["a", "b"], data: undefined },
    { headings: undefined, data: ["1", "2"] },
    { headings: undefined, data: ["3", "4"] },
    { headings: undefined, data: ["", "5"] },
  ]);
});

test("new labels add columns", async ({ simulator }) => {
  await simulator.run(`import log
log.set_labels('a', timestamp=None)
log.add(a=1)
log.add(a=2, c=3)
print('logged')
`);
  await simulator.expectSerial(/logged/);
  expect(await logEntries(simulator)).toEqual([
    { headings: ["a"], data: undefined },
    { headings: undefined, data: ["1"] },
    { headings: ["a", "c"], data: ["2", "3"] },
  ]);
});

test("timestamps rows by default", async ({ simulator }) => {
  await simulator.run(`import log
log.add(a=1)
print('logged')
`);
  await simulator.expectSerial(/logged/);
  const [entry] = await logEntries(simulator);
  expect(entry.headings).toEqual(["Time (seconds)", "a"]);
  expect((entry.data as string[])[0]).toMatch(/^\d+\.\d\d$/);
  expect((entry.data as string[])[1]).toBe("1");
});

test("mirrors to serial", async ({ simulator }) => {
  await simulator.run(`import log
log.set_mirroring(True)
log.set_labels('a', 'b', timestamp=None)
log.add(a=1, b=2)
`);
  await simulator.expectSerial(/^a,b\n1,2\n/);
});

test("delete notifies the embedder", async ({ simulator }) => {
  await simulator.run(`import log
log.add(a=1)
log.delete()
print('deleted')
`);
  await simulator.expectSerial(/deleted/);
  const kinds = (await simulator.messages())
    .map((m) => m.kind)
    .filter((k) => k.startsWith("log_"));
  // Flashing deletes any previous log too.
  expect(kinds.slice(-2)).toEqual(["log_output", "log_delete"]);
});

test("a full log raises OSError and reports it", async ({ simulator }) => {
  await simulator.run(`import log
log.set_labels('a', timestamp=None)
rows = 0
try:
    while True:
        log.add(a='x' * 200)
        rows += 1
except OSError as e:
    print('full after', rows, 'rows')
log.delete()
log.add(a='fits again')
print('ok')
`);
  await simulator.expectSerial(/^full after \d+ rows\nok\n/);
  const logFull = (await simulator.messages("state_change"))
    .map((m) => (m.change as any).dataLogging?.logFull)
    .filter((v) => v !== undefined);
  expect(logFull).toEqual([true, false]);
});
